/* ===== Bulk Data for FreelanceFlow - June 19, 2025 ============================== */

USE FreelanceFlow;

/* ----------------- USERS ----------------- */
INSERT INTO Users (Email, PasswordHash, FirstName, LastName, ProfilePicture, Role) VALUES
  ('juan.perez@example.com', '$2a$12$Zdz6t0v1K181WSDtlzmhGu0XYs3Eo5bIKnOZ7/rVBMsdqBLgHe3w.', 'Juan', 'Perez', '/uploads/profile1.jpg', 'professional'),
  ('maria.gomez@example.com', '$2a$12$Zdz6t0v1K181WSDtlzmhGu0XYs3Eo5bIKnOZ7/rVBMsdqBLgHe3w.', 'Maria', 'Gomez', '/uploads/profile2.jpg', 'client'),
  ('carlos.lopez@example.com', '$2a$12$Zdz6t0v1K181WSDtlzmhGu0XYs3Eo5bIKnOZ7/rVBMsdqBLgHe3w.', 'Carlos', 'Lopez', '/uploads/profile3.jpg', 'professional');

/* ----------------- PROFESSIONALS ----------------- */
INSERT INTO Professionals (UserId, Title, Bio, HourlyRate, Location) VALUES
  ((SELECT UserId FROM Users WHERE Email = 'juan.perez@example.com'), 'Web Developer', 'Experienced in React and Node.js', 50.00, 'Madrid, Spain'),
  ((SELECT UserId FROM Users WHERE Email = 'carlos.lopez@example.com'), 'Graphic Designer', 'Specialist in UI/UX design', 40.00, 'Barcelona, Spain');

/* ----------------- CLIENTS ----------------- */
INSERT INTO Clients (UserId, Phone) VALUES
  ((SELECT UserId FROM Users WHERE Email = 'maria.gomez@example.com'), '+34 612 345 678');

/* ----------------- SERVICES ----------------- */
INSERT INTO Services (ProfessionalId, Name, Description, BaseDuration, MaxDuration, DurationIncrement, Price) VALUES
  ((SELECT ProfessionalId FROM Professionals WHERE UserId = (SELECT UserId FROM Users WHERE Email = 'juan.perez@example.com')), 'Website Development', 'Custom website creation', 60, 240, 30, 100.00),
  ((SELECT ProfessionalId FROM Professionals WHERE UserId = (SELECT UserId FROM Users WHERE Email = 'carlos.lopez@example.com')), 'Logo Design', 'Unique logo creation', 30, 120, 15, 50.00);

/* ----------------- APPOINTMENTS ----------------- */
INSERT INTO Appointments (ServiceId, ProfessionalId, ClientId, StartTime, DurationMinutes, Status, Notes) VALUES
  ((SELECT ServiceId FROM Services WHERE ProfessionalId = (SELECT ProfessionalId FROM Professionals WHERE UserId = (SELECT UserId FROM Users WHERE Email = 'juan.perez@example.com')) LIMIT 1),
   (SELECT ProfessionalId FROM Professionals WHERE UserId = (SELECT UserId FROM Users WHERE Email = 'juan.perez@example.com')),
   (SELECT ClientId FROM Clients WHERE UserId = (SELECT UserId FROM Users WHERE Email = 'maria.gomez@example.com')),
   '2025-06-19 11:00:00', 60, 'pending', 'Initial consultation'),
  ((SELECT ServiceId FROM Services WHERE ProfessionalId = (SELECT ProfessionalId FROM Professionals WHERE UserId = (SELECT UserId FROM Users WHERE Email = 'carlos.lopez@example.com')) LIMIT 1),
   (SELECT ProfessionalId FROM Professionals WHERE UserId = (SELECT UserId FROM Users WHERE Email = 'carlos.lopez@example.com')),
   (SELECT ClientId FROM Clients WHERE UserId = (SELECT UserId FROM Users WHERE Email = 'maria.gomez@example.com')),
   '2025-06-19 14:00:00', 30, 'confirmed', 'Draft review');

/* ----------------- REVIEWS ----------------- */
INSERT INTO Reviews (AppointmentId, ProfessionalId, ClientId, Rating, Comment) VALUES
  ((SELECT AppointmentId FROM Appointments WHERE ProfessionalId = (SELECT ProfessionalId FROM Professionals WHERE UserId = (SELECT UserId FROM Users WHERE Email = 'juan.perez@example.com')) LIMIT 1),
   (SELECT ProfessionalId FROM Professionals WHERE UserId = (SELECT UserId FROM Users WHERE Email = 'juan.perez@example.com')),
   (SELECT ClientId FROM Clients WHERE UserId = (SELECT UserId FROM Users WHERE Email = 'maria.gomez@example.com')),
   4, 'Great service, very professional!'),
  ((SELECT AppointmentId FROM Appointments WHERE ProfessionalId = (SELECT ProfessionalId FROM Professionals WHERE UserId = (SELECT UserId FROM Users WHERE Email = 'carlos.lopez@example.com')) LIMIT 1),
   (SELECT ProfessionalId FROM Professionals WHERE UserId = (SELECT UserId FROM Users WHERE Email = 'carlos.lopez@example.com')),
   (SELECT ClientId FROM Clients WHERE UserId = (SELECT UserId FROM Users WHERE Email = 'maria.gomez@example.com')),
   5, 'Excellent design work!');

/* ----------------- AVAILABILITY ----------------- */
INSERT INTO Availability (ProfessionalId, DayOfWeek, StartTime, EndTime, IsRecurring, ValidFrom, ValidTo) VALUES
  ((SELECT ProfessionalId FROM Professionals WHERE UserId = (SELECT UserId FROM Users WHERE Email = 'juan.perez@example.com')), 'monday', '09:00:00', '17:00:00', 1, '2025-06-19', '2025-12-31'),
  ((SELECT ProfessionalId FROM Professionals WHERE UserId = (SELECT UserId FROM Users WHERE Email = 'carlos.lopez@example.com')), 'tuesday', '10:00:00', '18:00:00', 1, '2025-06-19', '2025-12-31');