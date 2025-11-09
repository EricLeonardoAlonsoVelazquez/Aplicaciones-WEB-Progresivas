FROM nginx:alpine

# Copiar los archivos del frontend
COPY frontend/ /usr/share/nginx/html

# Configuración de nginx
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

RUN chown -R nginx:nginx /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]