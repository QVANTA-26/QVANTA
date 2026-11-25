FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages

RUN npm ci

# Tailwind imports the "tailwind-preset" subpath from @qvanta/ui, which only
# resolves once that package has been built.
RUN npm --workspace @qvanta/types run build
RUN npm --workspace @qvanta/ui run build
RUN npm run build --workspace web

FROM nginx:1.27-alpine AS runtime

COPY infra/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
