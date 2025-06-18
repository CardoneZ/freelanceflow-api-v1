-- =============================================
-- Script de carga de datos de prueba (init_data.sql)
-- =============================================

-- 0) Limpiar tablas
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE Reviews;
TRUNCATE TABLE Appointments;
TRUNCATE TABLE Services;
TRUNCATE TABLE Availability;
TRUNCATE TABLE Clients;
TRUNCATE TABLE Professionals;
TRUNCATE TABLE Users;
SET FOREIGN_KEY_CHECKS = 1;

-- 1) Usuarios
INSERT INTO Users (Email, PasswordHash, FirstName, LastName, ProfilePicture, Role, CreatedAt) VALUES
  ('pro1@test.com', '$2y$10$kmyjkllUz8b2jKRYn.KpKOXHQRwdxT.391507oIWg2cqh6g6x0Kk.', 'Carlos', 'Martínez', '/uploads/pro1.jpg', 'professional', NOW()),
  ('pro2@test.com', '$2y$10$kmyjkllUz8b2jKRYn.KpKOXHQRwdxT.391507oIWg2cqh6g6x0Kk.', 'Ana', 'Rodríguez', '/uploads/pro2.jpg', 'professional', NOW()),
  ('cli1@test.com', '$2y$10$kmyjkllUz8b2jKRYn.KpKOXHQRwdxT.391507oIWg2cqh6g6x0Kk.', 'Luisa', 'Gómez',   '/uploads/cli1.jpg', 'client', NOW()),
  ('cli2@test.com', '$2y$10$kmyjkllUz8b2jKRYn.KpKOXHQRwdxT.391507oIWg2cqh6g6x0Kk.', 'Pedro', 'López',   '/uploads/cli2.jpg', 'client', NOW());

-- 2) Professionals
INSERT INTO Professionals (ProfessionalId, Title, Bio, HourlyRate, Location) VALUES
  ((SELECT UserId FROM Users WHERE Email = 'pro1@test.com'), 'Desarrollador FullStack', 'Especialista en JavaScript y Node.js', 45.00, 'Remoto'),
  ((SELECT UserId FROM Users WHERE Email = 'pro2@test.com'), 'Diseñador UX/UI', 'Experta en interfaces intuitivas', 35.00, 'Barcelona');

-- 3) Clients
INSERT INTO Clients (ClientId, Phone) VALUES
  ((SELECT UserId FROM Users WHERE Email = 'cli1@test.com'), '+34611223344'),
  ((SELECT UserId FROM Users WHERE Email = 'cli2@test.com'), '+34655667788');

-- 4) Services
INSERT INTO Services (ProfessionalId, Name, Description, BaseDuration, MaxDuration, DurationIncrement, Price, CreatedAt) VALUES
  (1, 'Desarrollo API REST', 'Creación de APIs con Node.js y Express', 60, 240, 30, 45.00, NOW()),
  (1, 'Consultoría técnica',   'Revisión de arquitectura de software', 30, 120, 30, 60.00, NOW()),
  (2, 'Diseño de interfaz',     'Creación de wireframes y prototipos',   90, 180, 30, 35.00, NOW());

-- 5) Availability
INSERT INTO Availability (
  ProfessionalId, DayOfWeek, StartTime, EndTime, IsRecurring, ValidFrom, ValidTo, createdAt, updatedAt
) VALUES
  (1, 'monday',    '09:00:00', '13:00:00', 1, NULL, NULL, NOW(), NOW()),
  (1, 'monday',    '15:00:00', '18:00:00', 1, NULL, NULL, NOW(), NOW()),
  (1, 'wednesday', '10:00:00', '14:00:00', 1, NULL, NULL, NOW(), NOW());

-- 6) Appointments (incluyendo nuevo campo ProfessionalId)
INSERT INTO Appointments (
  ServiceId, ProfessionalId, ClientId, StartTime, DurationMinutes, Status, CreatedAt
) VALUES
  (1, 1, 3, DATE_ADD(NOW(), INTERVAL 1 DAY), 60, 'confirmed', NOW()),
  (3, 2, 4, DATE_ADD(NOW(), INTERVAL 2 DAY), 90, 'pending',   NOW());

-- 7) Reviews (ahora con ProfessionalId y ClientId explícitos)
INSERT INTO Reviews (
  AppointmentId, ProfessionalId, ClientId, Rating, Comment, CreatedAt
) VALUES
  (1, 1, 3, 5, 'Excelente servicio, muy profesional', NOW());

-- 8) Credenciales de prueba
SELECT '====== CREDENCIALES ======' AS 'Pedro1031';
SELECT '🔑 Profesional 1: pro1@test.com / ' AS 'Pedro1031';
SELECT '🔑 Profesional 2: pro2@test.com / ...'             AS 'Pedro1031';
SELECT '🔑 Cliente 1: cli1@test.com / ...'                  AS 'Pedro1031';
SELECT '🔑 Cliente 2: cli2@test.com / ...'                  AS 'Pedro1031';
