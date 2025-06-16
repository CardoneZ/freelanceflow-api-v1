FROM node:20

# Crea app directory
WORKDIR /app

# Copia archivos
COPY package*.json ./
RUN npm install

COPY . .

# Exponer el puerto de Express
EXPOSE 4000

# Comando para arrancar el servidor
CMD ["npm", "start"]
