import os
import re
import json
import time

from fastapi import APIRouter, HTTPException
from qiskit import QuantumCircuit, QuantumRegister, ClassicalRegister, transpile
from qiskit_aer import AerSimulator
from qiskit.quantum_info import Statevector, partial_trace, DensityMatrix
import numpy as np

from app.schemas import CircuitRepr, SimulationRequest, SimulationResponse
from app.queue import (
    generate_job_id,
    enqueue_job,
    get_job_result,
    is_redis_enabled,
    set_job_result,
)

router = APIRouter(prefix="/simulate", tags=["simulate"])

# Qiskit method name -> canonical gate id.
QISKIT_TO_GATE = {
    "id": "I",
    "h": "H",
    "x": "X",
    "y": "Y",
    "z": "Z",
    "s": "S",
    "sdg": "Sdg",
    "t": "T",
    "tdg": "Tdg",
    "sx": "SX",
    "sxdg": "SXdg",
    "rx": "RX",
    "ry": "RY",
    "rz": "RZ",
    "p": "P",
    "u1": "P",
    "cx": "CNOT",
    "cnot": "CNOT",
    "cy": "CY",
    "cz": "CZ",
    "ch": "CH",
    "swap": "SWAP",
    "iswap": "iSWAP",
    "crx": "CRX",
    "cry": "CRY",
    "crz": "CRZ",
    "cp": "CP",
    "cu1": "CP",
    "ccx": "CCX",
    "toffoli": "CCX",
    "cswap": "CSWAP",
    "fredkin": "CSWAP",
    "ccz": "CCZ",
    "measure": "Measure",
    "barrier": "Barrier",
    "reset": "Reset",
}

# Gate id -> (qiskit method, whether the first argument is an angle).
GATE_TO_QISKIT_METHOD = {
    "I": ("id", False),
    "H": ("h", False),
    "X": ("x", False),
    "Y": ("y", False),
    "Z": ("z", False),
    "S": ("s", False),
    "Sdg": ("sdg", False),
    "T": ("t", False),
    "Tdg": ("tdg", False),
    "SX": ("sx", False),
    "SXdg": ("sxdg", False),
    "RX": ("rx", True),
    "RY": ("ry", True),
    "RZ": ("rz", True),
    "P": ("p", True),
    "CNOT": ("cx", False),
    "CY": ("cy", False),
    "CZ": ("cz", False),
    "CH": ("ch", False),
    "SWAP": ("swap", False),
    "iSWAP": ("iswap", False),
    "CRX": ("crx", True),
    "CRY": ("cry", True),
    "CRZ": ("crz", True),
    "CP": ("cp", True),
    "CCX": ("ccx", False),
    "CSWAP": ("cswap", False),
    "CCZ": ("ccz", False),
    "Measure": ("measure", False),
    "Barrier": ("barrier", False),
    "Reset": ("reset", False),
}

# Gates whose first call argument is a rotation angle.
QISKIT_PARAM_GATES = {gate for gate, (_, has_param) in GATE_TO_QISKIT_METHOD.items() if has_param}

# Allow only safe scaffolding plus registered qc.<method>(...) calls. The circuit
# is never executed as Python; calls are regex-extracted and replayed on a Qiskit
# QuantumCircuit, so a permissive gate-name match is safe here.
_ALLOWED_METHODS = "|".join(sorted(QISKIT_TO_GATE.keys(), key=len, reverse=True))
ALLOWED_QISKIT_LINE = re.compile(
    rf'^\s*(from qiskit|import|QuantumCircuit|QuantumRegister|ClassicalRegister|qc\s*=|qc\s*\.\s*(?:{_ALLOWED_METHODS})\s*\().*$'
)

_QISKIT_METHOD_RE = re.compile(r'qc\s*\.\s*(\w+)\s*\(([^)]*)\)')
_QISKIT_ARG_INDEX_RE = re.compile(r'^\s*[qc]?\s*\[?\s*(\d+)\s*\]?\s*$')

# JSON AST gate tables. Keys are the canonical gate ids used by the web app.
SINGLE_QUBIT_GATES = {
    "I": "id",
    "H": "h",
    "X": "x",
    "Y": "y",
    "Z": "z",
    "S": "s",
    "Sdg": "sdg",
    "T": "t",
    "Tdg": "tdg",
    "SX": "sx",
    "SXdg": "sxdg",
}

SINGLE_QUBIT_PARAM_GATES = {
    "RX": "rx",
    "RY": "ry",
    "RZ": "rz",
    "P": "p",
}

TWO_QUBIT_GATES = {
    "CNOT": "cx",
    "CY": "cy",
    "CZ": "cz",
    "CH": "ch",
    "SWAP": "swap",
    "iSWAP": "iswap",
}

TWO_QUBIT_PARAM_GATES = {
    "CRX": "crx",
    "CRY": "cry",
    "CRZ": "crz",
    "CP": "cp",
}

THREE_QUBIT_GATES = {
    "CCX": "ccx",
    "CSWAP": "cswap",
    "CCZ": "ccz",
}

SPECIAL_GATES = {"Measure", "Barrier", "Reset"}

# Backwards-compatible union of every JSON AST gate id.
GATE_MAP_JSON = {
    **SINGLE_QUBIT_GATES,
    **SINGLE_QUBIT_PARAM_GATES,
    **TWO_QUBIT_GATES,
    **TWO_QUBIT_PARAM_GATES,
    **THREE_QUBIT_GATES,
    "Measure": "measure",
    "Barrier": "barrier",
    "Reset": "reset",
}

_NUMBER_RE = re.compile(r'^-?\d+(\.\d+)?$')
_FRACTION_RE = re.compile(r'^(-?\d+(\.\d+)?)\s*/\s*(\d+(\.\d+)?)$')

PI_VARIANTS = {"pi", "PI", "Pi", "np.pi", "numpy.pi"}


def _safe_parse_angle(expr: str) -> float:
    expr = expr.strip()

    for variant in PI_VARIANTS:
        if expr == variant:
            return float(np.pi)

    neg = False
    if expr.startswith("-"):
        neg = True
        expr = expr[1:].strip()

    if expr.startswith("+"):
        expr = expr[1:].strip()

    mfrac = _FRACTION_RE.match(expr)
    if mfrac:
        numer = float(mfrac.group(1))
        denom = float(mfrac.group(3))
        if denom == 0:
            raise HTTPException(
                status_code=400,
                detail={"code": "circuit_parse_error", "message": "Division by zero in angle"}
            )
        val = numer / denom
        return -val if neg else val

    mnum = _NUMBER_RE.match(expr)
    if mnum:
        val = float(expr)
        return -val if neg else val

    for variant in PI_VARIANTS:
        prefix = f"{variant}*"
        if expr.startswith(prefix):
            coeff_str = expr[len(prefix):].strip()
            mfrac2 = _FRACTION_RE.match(coeff_str)
            if mfrac2:
                numer = float(mfrac2.group(1))
                denom = float(mfrac2.group(3))
                if denom == 0:
                    raise HTTPException(
                        status_code=400,
                        detail={"code": "circuit_parse_error", "message": "Division by zero in angle"}
                    )
                val = float(np.pi) * numer / denom
                return -val if neg else val
            mnum2 = _NUMBER_RE.match(coeff_str)
            if mnum2:
                val = float(np.pi) * float(coeff_str)
                return -val if neg else val
            raise HTTPException(
                status_code=400,
                detail={"code": "circuit_parse_error", "message": f"Cannot parse coefficient: {coeff_str}"}
            )

        suffix = f"*{variant}"
        if expr.endswith(suffix):
            coeff_str = expr[:-len(suffix)].strip()
            mfrac2 = _FRACTION_RE.match(coeff_str)
            if mfrac2:
                numer = float(mfrac2.group(1))
                denom = float(mfrac2.group(3))
                if denom == 0:
                    raise HTTPException(
                        status_code=400,
                        detail={"code": "circuit_parse_error", "message": "Division by zero in angle"}
                    )
                val = float(np.pi) * numer / denom
                return -val if neg else val
            mnum2 = _NUMBER_RE.match(coeff_str)
            if mnum2:
                val = float(np.pi) * float(coeff_str)
                return -val if neg else val
            raise HTTPException(
                status_code=400,
                detail={"code": "circuit_parse_error", "message": f"Cannot parse coefficient: {coeff_str}"}
            )

        div_prefix = f"{variant}/"
        if expr.startswith(div_prefix):
            denom_str = expr[len(div_prefix):].strip()
            if _NUMBER_RE.match(denom_str):
                denom = float(denom_str)
                if denom == 0:
                    raise HTTPException(
                        status_code=400,
                        detail={"code": "circuit_parse_error", "message": "Division by zero in angle"}
                    )
                val = float(np.pi) / denom
                return -val if neg else val

    raise HTTPException(
        status_code=400,
        detail={"code": "circuit_parse_error", "message": f"Unsupported angle expression: {expr}"}
    )


def _parse_qasm2(value: str) -> QuantumCircuit:
    try:
        return QuantumCircuit.from_qasm_str(value)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail={"code": "circuit_parse_error", "message": f"QASM2 parse error: {str(e)}"}
        )


def _parse_json_ast(value: str) -> QuantumCircuit:
    try:
        ast = json.loads(value)
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=400,
            detail={"code": "circuit_parse_error", "message": f"JSON parse error: {str(e)}"}
        )

    if not isinstance(ast, dict):
        raise HTTPException(
            status_code=400,
            detail={"code": "circuit_parse_error", "message": "JSON AST must be an object"}
        )

    n_qubits = ast.get("qubits")
    operations = ast.get("operations", [])

    if not isinstance(n_qubits, int) or n_qubits <= 0:
        raise HTTPException(
            status_code=400,
            detail={"code": "circuit_parse_error", "message": "qubits must be a positive integer"}
        )

    if not isinstance(operations, list):
        raise HTTPException(
            status_code=400,
            detail={"code": "circuit_parse_error", "message": "operations must be a list"}
        )

    has_measure = any(op.get("gate") == "Measure" for op in operations if isinstance(op, dict))

    qr = QuantumRegister(n_qubits, "q")
    if has_measure:
        cr = ClassicalRegister(n_qubits, "c")
        qc = QuantumCircuit(qr, cr)
    else:
        qc = QuantumCircuit(qr)

    for idx, op in enumerate(operations):
        if not isinstance(op, dict):
            raise HTTPException(
                status_code=400,
                detail={"code": "circuit_parse_error", "message": f"Operation {idx} must be an object"}
            )

        gate_name = op.get("gate")
        qubit = op.get("qubit")
        target = op.get("target")
        target2 = op.get("target2")
        parameter = op.get("parameter")

        if gate_name not in GATE_MAP_JSON:
            raise HTTPException(
                status_code=400,
                detail={"code": "circuit_parse_error", "message": f"Unknown gate: {gate_name} at operation {idx}"}
            )

        def check_qubit(value, label):
            if not isinstance(value, int) or isinstance(value, bool):
                raise HTTPException(
                    status_code=400,
                    detail={"code": "circuit_parse_error", "message": f"{gate_name} requires {label} at operation {idx}"}
                )
            if value < 0 or value >= n_qubits:
                raise HTTPException(
                    status_code=400,
                    detail={"code": "circuit_parse_error", "message": f"Qubit index out of range at operation {idx}"}
                )
            return value

        if gate_name == "Barrier":
            qc.barrier()
        elif gate_name == "Reset":
            qc.reset(check_qubit(qubit, "qubit"))
        elif gate_name == "Measure":
            if not has_measure:
                continue
            qc.measure(check_qubit(qubit, "qubit"), check_qubit(qubit, "qubit"))
        elif gate_name in SINGLE_QUBIT_GATES:
            getattr(qc, SINGLE_QUBIT_GATES[gate_name])(check_qubit(qubit, "qubit"))
        elif gate_name in SINGLE_QUBIT_PARAM_GATES:
            if not isinstance(parameter, (int, float)) or isinstance(parameter, bool):
                raise HTTPException(
                    status_code=400,
                    detail={"code": "circuit_parse_error", "message": f"{gate_name} requires a numeric parameter at operation {idx}"}
                )
            getattr(qc, SINGLE_QUBIT_PARAM_GATES[gate_name])(float(parameter), check_qubit(qubit, "qubit"))
        elif gate_name in TWO_QUBIT_GATES:
            getattr(qc, TWO_QUBIT_GATES[gate_name])(
                check_qubit(qubit, "qubit"), check_qubit(target, "target")
            )
        elif gate_name in TWO_QUBIT_PARAM_GATES:
            if not isinstance(parameter, (int, float)) or isinstance(parameter, bool):
                raise HTTPException(
                    status_code=400,
                    detail={"code": "circuit_parse_error", "message": f"{gate_name} requires a numeric parameter at operation {idx}"}
                )
            getattr(qc, TWO_QUBIT_PARAM_GATES[gate_name])(
                float(parameter), check_qubit(qubit, "qubit"), check_qubit(target, "target")
            )
        elif gate_name in THREE_QUBIT_GATES:
            getattr(qc, THREE_QUBIT_GATES[gate_name])(
                check_qubit(qubit, "qubit"),
                check_qubit(target, "target"),
                check_qubit(target2, "target2"),
            )

    return qc


def _qiskit_arg_index(arg: str):
    m = _QISKIT_ARG_INDEX_RE.match(arg)
    return int(m.group(1)) if m else None


def _parse_qiskit_code(value: str) -> QuantumCircuit:
    lines = value.split("\n")
    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        if not ALLOWED_QISKIT_LINE.match(line):
            raise HTTPException(
                status_code=400,
                detail={"code": "circuit_parse_error", "message": f"Disallowed line in qiskit_code: {stripped[:80]}"}
            )

    # Collect recognised gate calls in document order.
    calls: list[tuple[str, list[str]]] = []
    for m in _QISKIT_METHOD_RE.finditer(value):
        gate = QISKIT_TO_GATE.get(m.group(1).lower())
        if gate is None:
            continue
        args = [a.strip() for a in m.group(2).split(",") if a.strip()]
        calls.append((gate, args))

    n_qubits = 0
    n_clbits = 0
    qc_init_match = re.search(
        r'QuantumCircuit\s*\(\s*(\d+)\s*(?:,\s*(\d+)\s*)?\)', value
    )
    if qc_init_match:
        n_qubits = int(qc_init_match.group(1))
        if qc_init_match.group(2) is not None:
            n_clbits = int(qc_init_match.group(2))

    has_measure = any(gate == "Measure" for gate, _ in calls)

    for gate, args in calls:
        if gate == "Barrier":
            continue
        if gate == "Measure":
            q = _qiskit_arg_index(args[0]) if args else None
            c = _qiskit_arg_index(args[1]) if len(args) > 1 else q
            if q is not None and q + 1 > n_qubits:
                n_qubits = q + 1
            if c is not None and c + 1 > n_clbits:
                n_clbits = c + 1
            continue
        qubit_args = args[1:] if gate in QISKIT_PARAM_GATES else args
        for a in qubit_args:
            q = _qiskit_arg_index(a)
            if q is not None and q + 1 > n_qubits:
                n_qubits = q + 1

    if n_qubits == 0:
        n_qubits = 1
    if has_measure and n_clbits == 0:
        n_clbits = n_qubits

    qr = QuantumRegister(n_qubits, "q")
    if n_clbits > 0:
        qc = QuantumCircuit(qr, ClassicalRegister(n_clbits, "c"))
    else:
        qc = QuantumCircuit(qr)

    for gate, args in calls:
        if gate == "Barrier":
            qc.barrier()
            continue
        if gate == "Measure":
            q = _qiskit_arg_index(args[0]) if args else None
            c = _qiskit_arg_index(args[1]) if len(args) > 1 else q
            if q is None or c is None:
                raise HTTPException(
                    status_code=400,
                    detail={"code": "circuit_parse_error", "message": "Measure requires qubit and clbit indices"}
                )
            qc.measure(q, c)
            continue
        if gate == "Reset":
            q = _qiskit_arg_index(args[0]) if args else None
            if q is None:
                raise HTTPException(
                    status_code=400,
                    detail={"code": "circuit_parse_error", "message": "Reset requires a qubit index"}
                )
            qc.reset(q)
            continue

        method, has_param = GATE_TO_QISKIT_METHOD[gate]
        angle = None
        if has_param:
            if not args:
                raise HTTPException(
                    status_code=400,
                    detail={"code": "circuit_parse_error", "message": f"{gate} requires an angle argument"}
                )
            try:
                angle = _safe_parse_angle(args[0])
            except HTTPException:
                raise
            except Exception:
                raise HTTPException(
                    status_code=400,
                    detail={"code": "circuit_parse_error", "message": f"Cannot parse rotation angle: {args[0]}"}
                )
            qubit_args = args[1:]
        else:
            qubit_args = args

        qubits = [_qiskit_arg_index(a) for a in qubit_args]
        if not qubits or any(q is None for q in qubits):
            raise HTTPException(
                status_code=400,
                detail={"code": "circuit_parse_error", "message": f"Could not resolve qubits for gate {gate}"}
            )
        if angle is None:
            getattr(qc, method)(*qubits)
        else:
            getattr(qc, method)(angle, *qubits)

    return qc


def parse_circuit(circuit_repr: CircuitRepr) -> QuantumCircuit:
    if circuit_repr.kind == "qasm2":
        return _parse_qasm2(circuit_repr.value)
    elif circuit_repr.kind == "json_ast":
        return _parse_json_ast(circuit_repr.value)
    elif circuit_repr.kind == "qiskit_code":
        return _parse_qiskit_code(circuit_repr.value)
    else:
        raise HTTPException(
            status_code=400,
            detail={"code": "circuit_parse_error", "message": f"Unknown circuit kind: {circuit_repr.kind}"}
        )


def _bloch_from_density_matrix(rho: DensityMatrix) -> dict:
    data = rho.data
    rho_00 = data[0, 0]
    rho_01 = data[0, 1]
    rho_10 = data[1, 0]
    rho_11 = data[1, 1]
    x = 2.0 * float(np.real(rho_01))
    y = 2.0 * float(np.imag(rho_01))
    z = float(np.real(rho_00 - rho_11))
    return {"x": x, "y": y, "z": z}


def compute_per_qubit_bloch_from_statevector(sv: Statevector, n_qubits: int) -> list[dict]:
    bloch_list = []
    for i in range(n_qubits):
        keep_indices = [i]
        reduced = partial_trace(sv, [j for j in range(n_qubits) if j != i])
        bloch_list.append(_bloch_from_density_matrix(reduced))
    return bloch_list


def compute_per_qubit_bloch_from_densitymatrix(rho: DensityMatrix, n_qubits: int) -> list[dict]:
    bloch_list = []
    for i in range(n_qubits):
        reduced = partial_trace(rho, [j for j in range(n_qubits) if j != i])
        bloch_list.append(_bloch_from_density_matrix(reduced))
    return bloch_list


def statevector_to_list(sv: Statevector) -> list[dict]:
    result = []
    for amp in sv.data:
        result.append({"real": float(np.real(amp)), "imag": float(np.imag(amp))})
    return result


def has_measure_operations(qc: QuantumCircuit) -> bool:
    for instr, _, _ in qc.data:
        if instr.name == "measure":
            return True
    return False


def _statevector_from_circuit(qc: QuantumCircuit) -> Statevector:
    """Analytically derive the statevector, ignoring final measurements.

    ``AerSimulator`` only attaches a statevector to its result when the circuit
    contains a ``save_statevector`` instruction, so we compute the state exactly
    from the instructions instead of running a second simulation.
    """
    qc_sv = qc.remove_final_measurements(inplace=False)
    return Statevector.from_instruction(qc_sv)


def run_simulation_inline(qc: QuantumCircuit, shots: int) -> SimulationResponse:
    job_id = generate_job_id()
    start_time = time.time()

    try:
        n_qubits = qc.num_qubits
        has_meas = has_measure_operations(qc)
        has_clbits = qc.num_clbits > 0

        counts: dict[str, int] = {}
        sv_result = None
        per_qubit_bloch: list[dict] = []

        if has_meas and has_clbits:
            sim = AerSimulator(method="automatic")
            transpiled = transpile(qc, sim)
            result = sim.run(transpiled, shots=shots).result()
            counts_raw = result.get_counts()
            counts = {str(k): int(v) for k, v in counts_raw.items()}

        try:
            sv = _statevector_from_circuit(qc)
            sv_result = statevector_to_list(sv)
            per_qubit_bloch = compute_per_qubit_bloch_from_statevector(sv, n_qubits)
        except Exception:
            sv_result = None
            per_qubit_bloch = []

        execution_time_ms = (time.time() - start_time) * 1000.0

        return SimulationResponse(
            job_id=job_id,
            status="completed",
            counts=counts,
            per_qubit_bloch=per_qubit_bloch,
            statevector=sv_result,
            execution_time_ms=execution_time_ms,
            error=None,
        )
    except HTTPException:
        raise
    except Exception as e:
        execution_time_ms = (time.time() - start_time) * 1000.0
        return SimulationResponse(
            job_id=job_id,
            status="failed",
            counts={},
            per_qubit_bloch=[],
            statevector=None,
            execution_time_ms=execution_time_ms,
            error=str(e),
        )


@router.post("", response_model=SimulationResponse)
async def simulate_circuit(request: SimulationRequest) -> SimulationResponse:
    qc = parse_circuit(request.circuit_repr)

    # The Redis queue is only useful when a worker is deployed to drain it.
    # Without such a worker a queued job would never complete, so queueing is
    # opt-in and every simulation runs inline by default.
    queue_enabled = os.getenv("SIMULATOR_QUEUE_ENABLED", "0") == "1"
    should_queue = queue_enabled and request.shots >= 8192 and is_redis_enabled()

    if should_queue and is_redis_enabled():
        job_id = generate_job_id()
        payload = {
            "circuit_repr": request.circuit_repr.model_dump(),
            "backend": request.backend,
            "shots": request.shots,
        }
        enqueued = enqueue_job(job_id, payload)
        if enqueued:
            return SimulationResponse(
                job_id=job_id,
                status="queued",
                counts={},
                per_qubit_bloch=[],
                statevector=None,
                execution_time_ms=0.0,
                error=None,
            )

    response = run_simulation_inline(qc, request.shots)

    if is_redis_enabled() and response.status == "completed":
        set_job_result(response.job_id, response.model_dump())

    return response


@router.get("/jobs/{job_id}", response_model=SimulationResponse)
async def get_job(job_id: str) -> SimulationResponse:
    result = get_job_result(job_id)
    if result is None:
        raise HTTPException(
            status_code=404,
            detail={"code": "job_not_found", "message": f"Job {job_id} not found"}
        )

    try:
        return SimulationResponse(**result)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"code": "job_decode_error", "message": f"Could not decode job result: {str(e)}"}
        )
