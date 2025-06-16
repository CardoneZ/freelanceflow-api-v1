const db = require('../Models');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');

exports.getAllUsers = async (req, res, next) => {
  try {
    const { role, search, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const where = {};

    if (role) where.Role = role;
    if (search) {
      where[Op.or] = [
        { FirstName: { [Op.like]: `%${search}%` } },
        { LastName: { [Op.like]: `%${search}%` } },
        { Email: { [Op.like]: `%${search}%` } }
      ];
    }

    const users = await db.users.findAll({
      where,
      attributes: { exclude: ['PasswordHash'] },
      order: [['UserId', 'DESC']],
      offset,
      limit
    });

    res.json(users);
  } catch (error) {
    next(error);
  }
};

exports.getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    /* permiso: solo el propio usuario (o admin si ya lo controlas en middleware) */
    if (+req.user.UserId !== +id) {
      return res.status(403).json({ message: 'Not authorized to view this user' });
    }

    const user = await db.users.findByPk(id, {
      attributes: { exclude: ['PasswordHash'] }
    });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (err) { next(err); }
};


exports.updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { PasswordHash, ...updateData } = req.body;

    const user = await db.users.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (PasswordHash) {
      updateData.PasswordHash = await bcrypt.hash(PasswordHash, 12);
    }

    await user.update(updateData);

    const updatedUser = await db.users.findByPk(id, {
      attributes: { exclude: ['PasswordHash'] }
    });

    res.json(updatedUser);
  } catch (error) {
    next(error);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const user = await db.users.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await user.destroy();
    res.status(204).end(); // Respuesta exitosa sin contenido
  } catch (error) {
    next(error);
  }
};


// Obtener información del usuario actual
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await db.users.findByPk(req.user.UserId, {
      attributes: { exclude: ['PasswordHash'] },
      include: [
        {
          model: db.professionals,
          as: 'Professional',
          required: false,
          attributes: ['Title', 'Bio', 'HourlyRate', 'Location']
        },
        {
          model: db.clients,
          as: 'Client',
          required: false,
          attributes: ['Phone']
        }
      ]
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Formatear la respuesta
    const userData = {
      id: user.UserId,
      firstName: user.FirstName,
      lastName: user.LastName,
      email: user.Email,
      profilePicture: user.ProfilePicture,
      role: user.Role,
      createdAt: user.CreatedAt
    };

    // Agregar información específica del rol
    if (user.Role === 'professional' && user.Professional) {
      userData.professionalInfo = {
        title: user.Professional.Title,
        bio: user.Professional.Bio,
        hourlyRate: user.Professional.HourlyRate,
        location: user.Professional.Location
      };
    } else if (user.Role === 'client' && user.Client) {
      userData.clientInfo = {
        phone: user.Client.Phone
      };
    }

    res.status(200).json(userData);
  } catch (error) {
    console.error('Error getting current user:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: 'No file uploaded or file type not allowed' 
      });
    }

    const user = await db.users.findByPk(req.user.UserId);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    // Eliminar la imagen anterior si existe
    if (user.ProfilePicture) {
      const oldImagePath = path.join(__dirname, '../public', user.ProfilePicture);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }

    // Actualizar la base de datos
    user.ProfilePicture = `/uploads/profile-pictures/${req.file.filename}`;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile picture uploaded successfully',
      profilePicture: user.ProfilePicture
    });
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    res.status(500).json({ 
      success: false,
      message: error.message || 'Server error' 
    });
  }
};