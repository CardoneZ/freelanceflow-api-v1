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
