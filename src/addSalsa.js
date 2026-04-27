/**
 * addSalsa.js — Inserta el producto "Bote de salsa especial" si no existe ya.
 * Ejecutar con: node src/addSalsa.js
 * No borra nada, solo añade.
 */
require('dotenv').config();
const connectDB = require('./config/database');
const Producto = require('./models/producto.model');

async function main() {
    await connectDB();

    const existe = await Producto.findOne({ nombre: 'Bote de salsa especial' });
    if (existe) {
        console.log('✅ El producto ya existe en la base de datos. Nada que hacer.');
        process.exit(0);
    }

    await Producto.create({
        nombre: 'Bote de salsa especial',
        descripcion: 'Bote de nuestra salsa especial artesanal. Promoción 3x2.',
        precio: 1,
        categoria: 'SALSA',
        ingredientesPorDefecto: []
    });

    console.log('✅ "Bote de salsa especial" añadido correctamente (1€, categoría SALSA).');
    process.exit(0);
}

main().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});
