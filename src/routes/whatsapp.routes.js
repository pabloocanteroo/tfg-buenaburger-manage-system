const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/whatsapp.controller');

// Meta llama a GET para verificar el webhook al configurarlo
router.get('/webhook', controller.verificarWebhook);

// Meta llama a POST cada vez que llega un mensaje de WhatsApp
router.post('/webhook', controller.recibirMensaje);

module.exports = router;
