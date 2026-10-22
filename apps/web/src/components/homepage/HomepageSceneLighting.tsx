import React from 'react';

const HomepageSceneLighting: React.FC = () => {
  return (
    <>
       <color attach="background" args={['#0d0b0c']} />
       <fog attach="fog" args={['#0d0b0c', 9, 30]} />
      <ambientLight intensity={0.45} />
       <hemisphereLight args={['#8f102d', '#e4d5cc', 0.18]} />
      <directionalLight position={[4, 6, 5]} intensity={0.55} />
       <directionalLight position={[-5, 2, -3]} intensity={0.12} color="#8f102d" />
    </>
  );
};

export default HomepageSceneLighting;
