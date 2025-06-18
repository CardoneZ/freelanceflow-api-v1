/* ===== init.sql – FreelanceFlow ===================================== */

DROP DATABASE IF EXISTS FreelanceFlow;
CREATE DATABASE FreelanceFlow
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE FreelanceFlow;

/* Evita errores de dependencias al soltar/crear */
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS Reviews;
DROP TABLE IF EXISTS Appointments;
DROP TABLE IF EXISTS Services;
DROP TABLE IF EXISTS Clients;
DROP TABLE IF EXISTS Professionals;
DROP TABLE IF EXISTS Users;
DROP TABLE IF EXISTS Availability;

SET FOREIGN_KEY_CHECKS = 1;

/* -------------------- USERS -------------------- */
CREATE TABLE Users (
  UserId       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  Email        VARCHAR(255)  NOT NULL UNIQUE,
  PasswordHash VARCHAR(255)  NOT NULL,
  FirstName    VARCHAR(100),
  LastName     VARCHAR(100),
  ProfilePicture VARCHAR(255),  
  Role         ENUM('professional','client','admin') NOT NULL,
  createdAt    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* ------------------ PROFESSIONALS ------------------ */
CREATE TABLE Professionals (
  ProfessionalId INT UNSIGNED NOT NULL,
  Title          VARCHAR(100),
  Bio            TEXT,
  HourlyRate     DECIMAL(10,2),
  Location       VARCHAR(100),
  createdAt      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (ProfessionalId),
  CONSTRAINT fk_prof_user
    FOREIGN KEY (ProfessionalId) REFERENCES Users(UserId)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* --------------------- CLIENTS --------------------- */
CREATE TABLE Clients (
  ClientId INT UNSIGNED NOT NULL,
  Phone    VARCHAR(50),
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (ClientId),
  CONSTRAINT fk_client_user
    FOREIGN KEY (ClientId) REFERENCES Users(UserId)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* -------------------- SERVICES -------------------- */
CREATE TABLE Services (
  ServiceId       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ProfessionalId  INT UNSIGNED NOT NULL,
  Name            VARCHAR(150)  NOT NULL,
  Description     TEXT,
  BaseDuration    INT UNSIGNED NOT NULL DEFAULT 60,
  MaxDuration     INT UNSIGNED NOT NULL DEFAULT 240,
  DurationIncrement INT UNSIGNED NOT NULL DEFAULT 30,
  Price           DECIMAL(10,2) NOT NULL,
  createdAt       DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt       DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_services_professional (ProfessionalId),
  CONSTRAINT fk_service_prof
    FOREIGN KEY (ProfessionalId) REFERENCES Professionals(ProfessionalId)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* ------------------ APPOINTMENTS ------------------ */
CREATE TABLE Appointments (
  AppointmentId   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ServiceId       INT UNSIGNED NOT NULL,
  ProfessionalId  INT UNSIGNED NOT NULL,  -- Nueva columna agregada
  ClientId        INT UNSIGNED NOT NULL,
  StartTime       DATETIME     NOT NULL,
  DurationMinutes INT UNSIGNED NOT NULL,
  EndTime         DATETIME GENERATED ALWAYS AS
                  (DATE_ADD(StartTime, INTERVAL DurationMinutes MINUTE)) STORED,
  Status          ENUM('pending','confirmed','completed','canceled')
                  NOT NULL DEFAULT 'pending',
  Notes           TEXT,
  createdAt       DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt       DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_appt_service (ServiceId),
  KEY idx_appt_client  (ClientId),
  KEY idx_appt_professional (ProfessionalId),  -- Nuevo índice agregado
  KEY idx_appt_start_time (StartTime),         -- Nuevo índice para búsquedas por fecha
  CONSTRAINT fk_appt_service
    FOREIGN KEY (ServiceId) REFERENCES Services(ServiceId)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_appt_professional
    FOREIGN KEY (ProfessionalId) REFERENCES Professionals(ProfessionalId)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_appt_client
    FOREIGN KEY (ClientId) REFERENCES Clients(ClientId)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* -------------------- REVIEWS -------------------- */
CREATE TABLE Reviews (
  ReviewId      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  AppointmentId INT UNSIGNED NOT NULL,
  ProfessionalId INT UNSIGNED NOT NULL,  -- Nueva columna agregada
  ClientId      INT UNSIGNED NOT NULL,   -- Nueva columna agregada
  Rating        TINYINT UNSIGNED NOT NULL,
  Comment       TEXT,
  createdAt     DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt     DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_reviews_appointment (AppointmentId),
  CONSTRAINT fk_review_appt
    FOREIGN KEY (AppointmentId) REFERENCES Appointments(AppointmentId)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_review_professional
    FOREIGN KEY (ProfessionalId) REFERENCES Professionals(ProfessionalId)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_review_client
    FOREIGN KEY (ClientId) REFERENCES Clients(ClientId)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT chk_reviews_rating CHECK (Rating BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* ----------------- AVAILABILITY ----------------- */
CREATE TABLE Availability (
  AvailabilityId INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ProfessionalId INT UNSIGNED NOT NULL,
  DayOfWeek ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday') NOT NULL,
  StartTime TIME NOT NULL,
  EndTime TIME NOT NULL,
  IsRecurring TINYINT(1) DEFAULT 1,
  ValidFrom DATE,  
  ValidTo DATE,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_availability_professional
    FOREIGN KEY (ProfessionalId) REFERENCES Professionals(ProfessionalId)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;