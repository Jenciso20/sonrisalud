import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcryptjs';
import { sequelize } from '../src/config/db.js';
import { Usuario } from '../src/models/Usuario.js';

async function run() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const nombre = process.env.ADMIN_NOMBRE || 'Administrador';

  if (!email || !password) {
    console.error('Faltan ADMIN_EMAIL o ADMIN_PASSWORD en .env');
    process.exit(1);
  }

  try {
    await sequelize.authenticate();
    await sequelize.sync();

    const hashed = await bcrypt.hash(password, 10);
    let usuario = await Usuario.findOne({ where: { correo: email } });
    if (usuario) {
      usuario.nombre = nombre;
      usuario.password = hashed;
      usuario.rol = 'admin';
      await usuario.save();
      console.log(`Usuario existente promovido a admin: ${email}`);
    } else {
      usuario = await Usuario.create({
        nombre,
        correo: email,
        password: hashed,
        rol: 'admin',
      });
      console.log(`Admin creado: ${email}`);
    }

    process.exit(0);
  } catch (err) {
    console.error('Error al crear/promover admin:', err);
    process.exit(1);
  }
}

run();

