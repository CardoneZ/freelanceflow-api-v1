/* ───────────────────── authController.js ─────────────────────────── */
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
//const nodemailer = require('nodemailer');
const db       = require('../Models');
const { users } = db;

/* ═════ helpers ═════ */
const generateToken = user =>
  jwt.sign(
    { id: user.UserId, email: user.Email, role: user.Role },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );

/* ───────────── 1. REGISTER ───────────── */
exports.register = async (req, res, next) => {
  try {
    const {
      Email, Password, FirstName, LastName,
      Role = 'client', Phone,
      Title, Bio, HourlyRate, Location          // posibles campos de pro
    } = req.body;

    const role = Role.toLowerCase();
    const allowed = ['client', 'professional', 'admin'];
    if (!allowed.includes(role))
      return res.status(400).json({ message: 'Role must be client | professional | admin' });

    const exists = await users.findOne({ where: { Email } });
    if (exists) return res.status(400).json({ message: 'Email already in use' });

    const hashed = await bcrypt.hash(Password, 12);

    const user = await users.create({
      Email,
      PasswordHash: hashed,
      FirstName,
      LastName,
      Role: role
    });

    if (role === 'client') {
      await db.clients.create({ ClientId: user.UserId, Phone: Phone || null });
    }

    if (role === 'professional') {
      if (!Title || !Bio || !HourlyRate || !Location)
        return res.status(400).json({ message: 'Title, Bio, HourlyRate & Location are required' });

      await db.professionals.create({
        ProfessionalId: user.UserId,
        Title, Bio, HourlyRate, Location
      });
    }

    const token = generateToken(user);
    res.status(201).json({
      UserId:   user.UserId,
      Email,
      FirstName,
      LastName,
      Role:     user.Role,
      token
    });

  } catch (err) { next(err); }
};

/* ───────────── 2. UPGRADE (opcional) ───────────── */
exports.upgradeToProfessional = async (req, res, next) => {
  try {
    const { Title, Bio, HourlyRate, Location } = req.body;
    const userId = req.user.UserId;

    if (!Title || !Bio || !HourlyRate || !Location)
      return res.status(400).json({ message: 'Title, Bio, HourlyRate & Location are required' });

    const user = await users.findByPk(userId);
    if (!user || user.Role !== 'client')
      return res.status(400).json({ message: 'Only existing clients can upgrade' });

    const exists = await db.professionals.findByPk(userId);
    if (exists) return res.status(400).json({ message: 'User already professional' });

    await db.professionals.create({
      ProfessionalId: userId, Title, Bio, HourlyRate, Location
    });

    await user.update({ Role: 'professional' });

    const token = generateToken(user);   // nuevo token con rol actualizado
    res.json({ message: 'Upgraded to professional', token });

  } catch (err) { next(err); }
};

/* ───────────── 3. LOGIN ───────────── */
exports.login = async (req, res, next) => {
  try {
    const { Email, Password } = req.body;

    const user = await users.findOne({ where: { Email } });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const ok = await bcrypt.compare(Password, user.PasswordHash);
    if (!ok)  return res.status(401).json({ message: 'Invalid credentials' });

    const token = generateToken(user);
    res.json({
      UserId: user.UserId,
      Email,
      FirstName: user.FirstName,
      LastName : user.LastName,
      Role     : user.Role,
      token
    });

  } catch (err) { next(err); }
};

/* ───────────── 4. GET ME ───────────── */
exports.getMe = async (req, res, next) => {
  try {
    const user = await db.users.findByPk(req.user.UserId, { // Cambiar de req.user.id a req.user.UserId
      attributes: { exclude: ['PasswordHash'] },
      include: [
        {
          model: db.professionals,
          as: 'Professional',
          required: false
        },
        {
          model: db.clients,
          as: 'Client',
          required: false
        }
      ]
    });
    
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    res.json({
      ...user.get({ plain: true }),
      professionalInfo: user.Professional,
      clientInfo: user.Client
    });
  } catch (err) { next(err); }
};

/* 
const transporter = nodemailer.createTransport({
  host  : process.env.SMTP_HOST,
  port  : process.env.SMTP_PORT,
  secure: +process.env.SMTP_PORT === 465,   // SSL = 465
  auth  : {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

exports.forgotPassword = async (req, res, next) => {
  try {
    const { Email } = req.body;
    const user = await users.findOne({ where: { Email } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const token = jwt.sign({ id: user.UserId }, process.env.JWT_SECRET, { expiresIn: '1h' });

    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${token}`;

    await transporter.sendMail({
      from   : process.env.EMAIL_FROM,
      to     : Email,
      subject: 'Reset your FreelanceFlow password',
      html   : `
        <p>Hello ${user.FirstName || ''},</p>
        <p>Click the link below to reset your password. It expires in 1 hour.</p>
        <p><a href="${resetLink}">${resetLink}</a></p>
        <p>If you didn’t request this, please ignore this email.</p>
      `
    });

    res.json({ message: 'Password reset link sent' });

  } catch (err) { next(err); }
};


exports.resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { Password } = req.body;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await users.findByPk(decoded.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.PasswordHash = await bcrypt.hash(Password, 12);
    await user.save();

    res.json({ message: 'Password updated successfully' });

  } catch (err) { next(err); }
};


exports.changePassword = async (req, res, next) => {
  try {
    const { CurrentPassword, NewPassword } = req.body;

    const user = await users.findByPk(req.user.UserId);
    const ok   = await bcrypt.compare(CurrentPassword, user.PasswordHash);
    if (!ok) return res.status(400).json({ message: 'Current password is incorrect' });

    user.PasswordHash = await bcrypt.hash(NewPassword, 12);
    await user.save();

    res.json({ message: 'Password changed successfully' });

  } catch (err) { next(err); }
};
*/