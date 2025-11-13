const readingService = require('../services/readingService');

class ReadingController {
  async getUserReadings(req, res) {
    try {
      const userEmail = req.user.email;
      
      console.log('📊 Obteniendo lecturas para:', userEmail);

      const readings = await readingService.findByEmail(userEmail);

      console.log('✅ Lecturas obtenidas:', readings.length);

      res.json({
        success: true,
        data: readings.map(reading => ({
          ...reading.toJSON(),
          formattedDate: reading.getFormattedDate(),
          status: reading.getStatus()
        }))
      });

    } catch (error) {
      console.error('Error in getUserReadings:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor al obtener lecturas'
      });
    }
  }

  async getUserStats(req, res) {
    try {
      const userEmail = req.user.email;
      
      console.log('📈 Obteniendo estadísticas para:', userEmail);

      const stats = await readingService.getStatsByEmail(userEmail);

      console.log('✅ Estadísticas obtenidas:', stats);

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Error in getUserStats:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor al obtener estadísticas'
      });
    }
  }

  async getLatestReading(req, res) {
    try {
      const userEmail = req.user.email;
      
      console.log('🕒 Obteniendo última lectura para:', userEmail);

      const latestReading = await readingService.getLatestByEmail(userEmail);

      if (!latestReading) {
        return res.json({
          success: true,
          data: null,
          message: 'No se encontraron lecturas'
        });
      }

      console.log('✅ Última lectura obtenida');

      res.json({
        success: true,
        data: {
          ...latestReading.toJSON(),
          formattedDate: latestReading.getFormattedDate(),
          status: latestReading.getStatus()
        }
      });

    } catch (error) {
      console.error('Error in getLatestReading:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor al obtener última lectura'
      });
    }
  }

  async createReading(req, res) {
    try {
      const { humedadAire, humedadSuelo, temperatura } = req.body;
      const userEmail = req.user.email;

      console.log('➕ Creando nueva lectura para:', userEmail);

      const readingData = {
        email: userEmail,
        fecha: new Date(),
        humedadAire,
        humedadSuelo,
        temperatura
      };

      const reading = await readingService.createReading(readingData);

      console.log('✅ Lectura creada exitosamente');

      res.status(201).json({
        success: true,
        message: 'Lectura guardada exitosamente',
        data: reading
      });

    } catch (error) {
      console.error('Error in createReading:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor al guardar lectura'
      });
    }
  }
}

module.exports = new ReadingController();