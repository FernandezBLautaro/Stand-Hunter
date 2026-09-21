const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");

admin.initializeApp();
setGlobalOptions({ region: "us-central1" });

exports.adminAuth = require("./adminAuth").adminAuth;
exports.crearExperiencia = require("./crearExperiencia").crearExperiencia;

// exports.validarRespuesta = require("./validarRespuesta").validarRespuesta;
// exports.confirmarCanje = require("./confirmarCanje").confirmarCanje;
// exports.chatbotProxy = require("./chatbotProxy").chatbotProxy;