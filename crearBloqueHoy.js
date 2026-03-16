/**
 * crearBloqueHoy.js — Borra bloques de hoy y crea bloques de prueba
 * Hoy: 20:30 - 23:00, cada 5 minutos, capacidad 10
 * Uso: node crearBloqueHoy.js
 */

require('dotenv').config();
const connectDB = require('./src/config/database');
const BloqueProduccion = require('./src/models/bloqueProduccion.model');

function pad(n) { return String(n).padStart(2, '0'); }

function generarHoras(desde, hasta, minutos) {
    const [dh, dm] = desde.split(':').map(Number);
    const [hh, hm] = hasta.split(':').map(Number);
    const inicioMin = dh * 60 + dm;
    const finMin   = hh * 60 + hm;
    const bloques = [];
    for (let t = inicioMin; t < finMin; t += minutos) {
        const tf = t + minutos;
        bloques.push({
            inicio: `${pad(Math.floor(t / 60))}:${pad(t % 60)}`,
            fin:    `${pad(Math.floor(tf / 60))}:${pad(tf % 60)}`
        });
    }
    return bloques;
}

async function main() {
    await connectDB();

    const ahora  = new Date();
    const fecha  = `${ahora.getFullYear()}-${pad(ahora.getMonth() + 1)}-${pad(ahora.getDate())}`;
    const horas  = generarHoras('20:30', '23:00', 5);  // 30 bloques de 5 min

    console.log(`📅 Fecha: ${fecha}`);
    console.log(`🗑️  Borrando bloques existentes de hoy...`);
    const { deletedCount } = await BloqueProduccion.deleteMany({ fecha });
    console.log(`   ${deletedCount} bloques eliminados.`);

    console.log(`\n🕗 Creando ${horas.length} bloques (20:30 → 23:00, cada 5 min, cap. 10)...`);
    const docs = horas.map(h => ({
        fecha,
        horaInicio: h.inicio,
        horaFin:    h.fin,
        capacidadMax: 10,
        hamburgesasOcupadas: 0,
        cerrado: false
    }));

    await BloqueProduccion.insertMany(docs);
    console.log(`\n✅ ${horas.length} bloques creados correctamente.\n`);
    process.exit(0);
}

main().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});
