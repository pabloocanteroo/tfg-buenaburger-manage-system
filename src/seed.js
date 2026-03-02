/**
 * seed.js — Poblar la base de datos con los datos reales de la carta de Buena Burger
 * Ejecutar con: node src/seed.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/database');

const Producto = require('./models/producto.model');
const Extra = require('./models/extra.model');
const Usuario = require('./models/usuario.model');

const productos = [
    // ── Hamburguesas ──────────────────────────────────────────────────────────
    {
        nombre: 'Bacon Burger',
        descripcion: 'Smash de 100% vacuno fresco con salsa especial, bacon, 2 carnes y queso.',
        precio: 12,
        categoria: 'HAMBURGUESA',
        ingredientesPorDefecto: ['salsa especial', 'bacon', 'queso']
    },
    {
        nombre: 'Buena Burger',
        descripcion: 'Smash de 100% vacuno fresco con salsa especial, queso, pepinillos, cebolla y 2 carnes.',
        precio: 10,
        categoria: 'HAMBURGUESA',
        ingredientesPorDefecto: ['salsa especial', 'queso', 'pepinillos', 'cebolla']
    },
    {
        nombre: 'Bestia Burger',
        descripcion: 'Smash de 100% vacuno fresco con salsa especial, bacon, cebolla caramelizada, 3 carnes y queso.',
        precio: 15,
        categoria: 'HAMBURGUESA',
        ingredientesPorDefecto: ['salsa especial', 'bacon', 'cebolla caramelizada', 'queso']
    },
    {
        nombre: 'Butter Burger',
        descripcion: 'Smash de 100% vacuno fresco con salsa especial, mantequilla, cebolla caramelizada, queso y 2 carnes.',
        precio: 11,
        categoria: 'HAMBURGUESA',
        ingredientesPorDefecto: ['salsa especial', 'mantequilla', 'cebolla caramelizada', 'queso']
    },
    // ── Patatas ───────────────────────────────────────────────────────────────
    {
        nombre: 'Patatas normales',
        descripcion: 'Patatas fritas. Se puede quitar salsa o sal.',
        precio: 3,
        categoria: 'PATATAS',
        ingredientesPorDefecto: ['sal']
    },
    {
        nombre: 'Buenas Fries',
        descripcion: 'Doble ración con salsa especial. Se puede quitar salsa o sal.',
        precio: 5,
        categoria: 'PATATAS',
        ingredientesPorDefecto: ['salsa especial', 'sal']
    },
    // ── Bebidas ───────────────────────────────────────────────────────────────
    {
        nombre: 'Agua',
        descripcion: 'Agua mineral.',
        precio: 1,
        categoria: 'BEBIDA',
        ingredientesPorDefecto: []
    },
    {
        nombre: 'Coca-Cola',
        descripcion: 'Coca-Cola normal o Zero.',
        precio: 1.5,
        categoria: 'BEBIDA',
        ingredientesPorDefecto: []
    }
];

const extras = [
    // ── Extras de pago ────────────────────────────────────────────────────────
    { nombre: 'Cebolla caramelizada', precio: 0.5, cantidadMaxima: 10 },
    { nombre: 'Pepinillo', precio: 0.5, cantidadMaxima: 10 },
    { nombre: 'Cebolla', precio: 0.5, cantidadMaxima: 10 },
    { nombre: 'Mantequilla', precio: 0.5, cantidadMaxima: 10 },
    { nombre: 'Bacon', precio: 2, cantidadMaxima: 10 },
    { nombre: 'Carne extra', precio: 2, cantidadMaxima: 10 },
    { nombre: 'Queso', precio: 1, cantidadMaxima: 10 },
    // ── Extras gratuitos (precio = 0) ─────────────────────────────────────────
    { nombre: 'Salsa especial', precio: 0, cantidadMaxima: 10 },
    { nombre: 'Salsa picante', precio: 0, cantidadMaxima: 10 }
];

const adminInicial = {
    nombre: 'Admin Buena Burger',
    email: 'admin@buenaburger.es',
    passwordHash: 'Admin1234!',
    rol: 'ADMIN'
};

async function seed() {
    await connectDB();

    console.log('🌱 Limpiando colecciones...');
    await Producto.deleteMany({});
    await Extra.deleteMany({});
    await Usuario.deleteMany({});

    console.log('🍔 Insertando productos...');
    const productosCreados = await Producto.insertMany(productos);
    console.log(`   ✅ ${productosCreados.length} productos insertados`);

    console.log('🧀 Insertando extras...');
    const extrasCreados = await Extra.insertMany(extras);
    console.log(`   ✅ ${extrasCreados.length} extras insertados`);

    console.log('👤 Creando usuario admin...');
    await Usuario.create(adminInicial);
    console.log(`   ✅ Admin creado: ${adminInicial.email} / Admin1234!`);

    console.log('\n✅ Seed completado correctamente.\n');
    process.exit(0);
}

seed().catch(err => {
    console.error('❌ Error en el seed:', err.message);
    process.exit(1);
});
