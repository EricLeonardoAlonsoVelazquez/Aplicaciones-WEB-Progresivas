// controllers/authController.js
const userService = require('../services/userService');

class AuthController {
  async register(req, res) {
    try {
      const { name, email, password } = req.body;

      // Validar registro
      const validationErrors = await userService.validateUserRegistration({
        name,
        email,
        password
      });

      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          message: validationErrors.join(', ')
        });
      }

      // Crear usuario
      const user = await userService.createUser({
        name,
        email,
        password
      });

      res.status(201).json({
        success: true,
        message: 'Usuario registrado exitosamente',
        user: user
      });

    } catch (error) {
      console.error('Error in register:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Validar credenciales
      const { errors, user } = await userService.validateLoginCredentials(email, password);

      if (errors.length > 0) {
        return res.status(401).json({
          success: false,
          message: errors.join(', ')
        });
      }

      // Actualizar último acceso
      await userService.updateLastAccess(user.id);

      res.json({
        success: true,
        message: 'Login exitoso',
        user: user.toJSON()
      });

    } catch (error) {
      console.error('Error in login:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
}

module.exports = new AuthController();