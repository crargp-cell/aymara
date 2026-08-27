-- ============================================================
-- Conversión automática de MySQL/MariaDB (phpMyAdmin dump) a PostgreSQL
-- Generado con mysql2pg.py
-- ============================================================

BEGIN;

-- Tipos ENUM nativos de PostgreSQL
DROP TYPE IF EXISTS "access_logs_action_enum" CASCADE;
CREATE TYPE "access_logs_action_enum" AS ENUM ('login_success','login_failed','logout','view','create','update','delete');
DROP TYPE IF EXISTS "ar_cards_unlock_type_enum" CASCADE;
CREATE TYPE "ar_cards_unlock_type_enum" AS ENUM ('lesson','exam');
DROP TYPE IF EXISTS "content_order_content_type_enum" CASCADE;
CREATE TYPE "content_order_content_type_enum" AS ENUM ('lesson','exam');
DROP TYPE IF EXISTS "exams_type_enum" CASCADE;
CREATE TYPE "exams_type_enum" AS ENUM ('conectar_palabras','ar_exam');
DROP TYPE IF EXISTS "exam_details_config_type_enum" CASCADE;
CREATE TYPE "exam_details_config_type_enum" AS ENUM ('categories','ar_markers','ar_cards');
DROP TYPE IF EXISTS "exercises_type_enum" CASCADE;
CREATE TYPE "exercises_type_enum" AS ENUM ('text','multiple_choice','matching','fill_in_the_blank');
DROP TYPE IF EXISTS "exercises_dificultad_enum" CASCADE;
CREATE TYPE "exercises_dificultad_enum" AS ENUM ('facil','medio','dificil');
DROP TYPE IF EXISTS "exercise_attempts_difficulty_level_enum" CASCADE;
CREATE TYPE "exercise_attempts_difficulty_level_enum" AS ENUM ('facil','medio','dificil');
DROP TYPE IF EXISTS "statistics_aggregated_stat_type_enum" CASCADE;
CREATE TYPE "statistics_aggregated_stat_type_enum" AS ENUM ('exercise','lesson','course','student');
DROP TYPE IF EXISTS "statistics_aggregated_predicted_difficulty_enum" CASCADE;
CREATE TYPE "statistics_aggregated_predicted_difficulty_enum" AS ENUM ('facil','medio','dificil');
DROP TYPE IF EXISTS "user_ar_cards_unlocked_by_enum" CASCADE;
CREATE TYPE "user_ar_cards_unlocked_by_enum" AS ENUM ('lesson','exam');
DROP TYPE IF EXISTS "user_attempt_details_difficulty_level_enum" CASCADE;
CREATE TYPE "user_attempt_details_difficulty_level_enum" AS ENUM ('facil','medio','dificil');
DROP TYPE IF EXISTS "usuarios_role_enum" CASCADE;
CREATE TYPE "usuarios_role_enum" AS ENUM ('maestro','estudiante','admin');

-- Funciones para columnas con ON UPDATE CURRENT_TIMESTAMP (comportamiento MySQL)
CREATE OR REPLACE FUNCTION "set_last_seen_at_timestamp"() RETURNS trigger AS $$
BEGIN
  NEW."last_seen_at" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION "set_updated_at_timestamp"() RETURNS trigger AS $$
BEGIN
  NEW."updated_at" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tabla: access_logs
DROP TABLE IF EXISTS "access_logs" CASCADE;
CREATE TABLE "access_logs" (
  "id" bigserial NOT NULL,
  "user_id" bigint DEFAULT NULL,
  "email" varchar(190) DEFAULT NULL,
  "username" varchar(190) DEFAULT NULL,
  "action" access_logs_action_enum NOT NULL,
  "path" varchar(255) NOT NULL,
  "method" varchar(10) NOT NULL,
  "ip" varchar(45) NOT NULL,
  "user_agent" text DEFAULT NULL,
  "status" smallint NOT NULL DEFAULT 200,
  "message" varchar(255) DEFAULT NULL,
  "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: archivos
DROP TABLE IF EXISTS "archivos" CASCADE;
CREATE TABLE "archivos" (
  "id" serial NOT NULL,
  "nombre" varchar(255) NOT NULL,
  "ruta" varchar(255) NOT NULL,
  "uploaded_by" integer DEFAULT NULL,
  "fecha_subida" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "activo" boolean NOT NULL,
  "curso" integer NOT NULL
);

-- Tabla: ar_cards
DROP TABLE IF EXISTS "ar_cards" CASCADE;
CREATE TABLE "ar_cards" (
  "id" serial NOT NULL,
  "user_id" integer DEFAULT NULL,
  "created_by" integer DEFAULT NULL,
  "exercise_id" integer DEFAULT NULL,
  "lesson_id" integer DEFAULT NULL,
  "exam_id" integer DEFAULT NULL,
  "card_code" varchar(50) NOT NULL,
  "title" varchar(255) DEFAULT NULL,
  "description" text DEFAULT NULL,
  "marker_file" varchar(255) NOT NULL,
  "card_data" text DEFAULT NULL,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
  "unlocked_at" timestamp DEFAULT CURRENT_TIMESTAMP,
  "is_unlocked" boolean NOT NULL DEFAULT false,
  "activo" boolean NOT NULL DEFAULT true,
  "unlock_type" ar_cards_unlock_type_enum DEFAULT 'lesson',
  "unlock_exam_id" integer DEFAULT NULL
);

-- Tabla: content_order
DROP TABLE IF EXISTS "content_order" CASCADE;
CREATE TABLE "content_order" (
  "id" serial NOT NULL,
  "curso_id" integer NOT NULL,
  "content_type" content_order_content_type_enum NOT NULL,
  "content_id" integer NOT NULL,
  "orden" integer NOT NULL,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON COLUMN "content_order"."curso_id" IS 'ID del curso';
COMMENT ON COLUMN "content_order"."content_type" IS 'Tipo de contenido: lección o examen';
COMMENT ON COLUMN "content_order"."content_id" IS 'ID de la lección o examen';
COMMENT ON COLUMN "content_order"."orden" IS 'Orden de visualización (1, 2, 3, ...)';

-- Tabla: curso
DROP TABLE IF EXISTS "curso" CASCADE;
CREATE TABLE "curso" (
  "id_cur" serial NOT NULL,
  "nombre" varchar(11) NOT NULL,
  "id_doc" integer NOT NULL
);

-- Tabla: diccionario
DROP TABLE IF EXISTS "diccionario" CASCADE;
CREATE TABLE "diccionario" (
  "id" serial NOT NULL,
  "aymara" varchar(50) DEFAULT NULL,
  "espanol" varchar(50) DEFAULT NULL,
  "activo" boolean NOT NULL DEFAULT true,
  "categoria" varchar(50) NOT NULL,
  "curso" integer DEFAULT NULL
);

-- Tabla: difficulty_levels
DROP TABLE IF EXISTS "difficulty_levels" CASCADE;
CREATE TABLE "difficulty_levels" (
  "id" serial NOT NULL,
  "level_code" varchar(20) NOT NULL,
  "level_name" varchar(50) NOT NULL,
  "points_multiplier" numeric(3,2) DEFAULT 1.00,
  "time_multiplier" numeric(3,2) DEFAULT 1.00,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: error_patterns
DROP TABLE IF EXISTS "error_patterns" CASCADE;
CREATE TABLE "error_patterns" (
  "id" serial NOT NULL,
  "user_id" integer DEFAULT NULL,
  "exercise_id" integer DEFAULT NULL,
  "lesson_id" integer DEFAULT NULL,
  "error_type" varchar(100) NOT NULL,
  "error_description" text DEFAULT NULL,
  "frequency" integer DEFAULT 1,
  "pattern_data" text DEFAULT NULL,
  "detected_at" timestamp DEFAULT CURRENT_TIMESTAMP,
  "last_occurrence" timestamp DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: exams
DROP TABLE IF EXISTS "exams" CASCADE;
CREATE TABLE "exams" (
  "id" serial NOT NULL,
  "lesson_id" integer DEFAULT NULL,
  "position_order" integer DEFAULT NULL,
  "type" exams_type_enum NOT NULL DEFAULT 'conectar_palabras',
  "title" varchar(255) NOT NULL,
  "description" text DEFAULT NULL,
  "time_limit" integer DEFAULT NULL,
  "start_date" timestamp DEFAULT NULL,
  "end_date" timestamp NOT NULL,
  "min_score" integer DEFAULT 70,
  "ar_card_id" integer DEFAULT NULL,
  "active" boolean NOT NULL DEFAULT true,
  "created_by" integer NOT NULL,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON COLUMN "exams"."position_order" IS 'Orden de posición entre lecciones (ej: 1.5 = entre lección 1 y 2)';
COMMENT ON COLUMN "exams"."time_limit" IS 'Tiempo límite en minutos';
COMMENT ON COLUMN "exams"."start_date" IS 'Fecha de inicio del examen';
COMMENT ON COLUMN "exams"."end_date" IS 'Fecha límite del examen';
COMMENT ON COLUMN "exams"."min_score" IS 'Puntuación mínima para aprobar (%)';
COMMENT ON COLUMN "exams"."ar_card_id" IS 'ID de la tarjeta AR específica que se otorga al aprobar este examen';
COMMENT ON COLUMN "exams"."created_by" IS 'ID del maestro que creó el examen';

-- Tabla: exam_attempts
DROP TABLE IF EXISTS "exam_attempts" CASCADE;
CREATE TABLE "exam_attempts" (
  "id" serial NOT NULL,
  "exam_id" integer NOT NULL,
  "user_id" integer NOT NULL,
  "started_at" timestamp DEFAULT CURRENT_TIMESTAMP,
  "completed_at" timestamp DEFAULT NULL,
  "time_spent" integer DEFAULT NULL,
  "score" numeric(5,2) DEFAULT NULL,
  "passed" boolean DEFAULT false,
  "result_id" integer DEFAULT NULL
);

COMMENT ON COLUMN "exam_attempts"."time_spent" IS 'Tiempo en segundos';
COMMENT ON COLUMN "exam_attempts"."result_id" IS 'Referencia a exam_results';

-- Tabla: exam_details
DROP TABLE IF EXISTS "exam_details" CASCADE;
CREATE TABLE "exam_details" (
  "id" serial NOT NULL,
  "exam_id" integer NOT NULL,
  "config_type" exam_details_config_type_enum NOT NULL,
  "config_value" text NOT NULL,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON COLUMN "exam_details"."config_type" IS 'Tipo de configuración: categories para conectar_palabras, ar_markers para ar_exam (legacy), ar_cards para ar_exam (nuevo)';
COMMENT ON COLUMN "exam_details"."config_value" IS 'Valor de configuración: JSON con categorías o IDs de marcadores AR';

-- Tabla: exam_results
DROP TABLE IF EXISTS "exam_results" CASCADE;
CREATE TABLE "exam_results" (
  "id" serial NOT NULL,
  "exam_id" integer DEFAULT NULL,
  "user_id" integer NOT NULL,
  "lesson_id" integer DEFAULT NULL,
  "score" integer DEFAULT 0,
  "total_words" integer DEFAULT 0,
  "correct_matches" integer DEFAULT 0,
  "time_spent" numeric(10,2) DEFAULT 0.00,
  "difficulty" varchar(20) DEFAULT 'normal',
  "passed" boolean DEFAULT false,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: exercises
DROP TABLE IF EXISTS "exercises" CASCADE;
CREATE TABLE "exercises" (
  "id" serial NOT NULL,
  "lesson_id" integer NOT NULL,
  "type" exercises_type_enum NOT NULL,
  "question" text NOT NULL,
  "answer" text DEFAULT NULL,
  "dificultad" exercises_dificultad_enum NOT NULL DEFAULT 'medio',
  "activo" boolean NOT NULL DEFAULT true
);

-- Tabla: exercise_attempts
DROP TABLE IF EXISTS "exercise_attempts" CASCADE;
CREATE TABLE "exercise_attempts" (
  "id" serial NOT NULL,
  "user_id" integer NOT NULL,
  "exercise_id" integer NOT NULL,
  "lesson_id" integer NOT NULL,
  "attempt_number" integer DEFAULT 1,
  "user_answer" text DEFAULT NULL,
  "correct_answer" text DEFAULT NULL,
  "is_correct" boolean DEFAULT false,
  "score" integer DEFAULT 0,
  "time_spent" integer DEFAULT 0,
  "error_type" varchar(100) DEFAULT NULL,
  "error_details" text DEFAULT NULL,
  "exercise_type" varchar(50) DEFAULT NULL,
  "difficulty_level" exercise_attempts_difficulty_level_enum DEFAULT 'medio',
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: exercise_types
DROP TABLE IF EXISTS "exercise_types" CASCADE;
CREATE TABLE "exercise_types" (
  "id" serial NOT NULL,
  "type_code" varchar(50) NOT NULL,
  "type_name" varchar(100) NOT NULL,
  "description" text DEFAULT NULL,
  "requires_options" boolean DEFAULT false,
  "requires_pairs" boolean DEFAULT false,
  "requires_answers" boolean DEFAULT false,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: fill_in_the_blank_answers
DROP TABLE IF EXISTS "fill_in_the_blank_answers" CASCADE;
CREATE TABLE "fill_in_the_blank_answers" (
  "id" serial NOT NULL,
  "exercise_id" integer NOT NULL,
  "answer_text" varchar(255) NOT NULL
);

-- Tabla: lessons
DROP TABLE IF EXISTS "lessons" CASCADE;
CREATE TABLE "lessons" (
  "id" serial NOT NULL,
  "exam_id" integer DEFAULT NULL,
  "title" varchar(255) NOT NULL,
  "description" text DEFAULT NULL,
  "curso" integer NOT NULL,
  "orden" integer NOT NULL DEFAULT 1,
  "activo" boolean NOT NULL DEFAULT true,
  "grants_ar_marker" boolean NOT NULL DEFAULT false,
  "ar_card_id" integer DEFAULT NULL,
  "maestro_id" integer NOT NULL,
  "default_topic_id" integer DEFAULT NULL
);

COMMENT ON COLUMN "lessons"."grants_ar_marker" IS 'Indica si completar esta lección otorga un marcador AR';
COMMENT ON COLUMN "lessons"."ar_card_id" IS 'ID de la tarjeta AR específica que se otorga al completar esta lección';

-- Tabla: lesson_topics
DROP TABLE IF EXISTS "lesson_topics" CASCADE;
CREATE TABLE "lesson_topics" (
  "id" serial NOT NULL,
  "lesson_id" integer NOT NULL,
  "title" varchar(255) NOT NULL,
  "content" text DEFAULT NULL,
  "file_path" varchar(500) DEFAULT NULL,
  "order" integer DEFAULT 0,
  "activo" boolean DEFAULT true,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: matching_pairs
DROP TABLE IF EXISTS "matching_pairs" CASCADE;
CREATE TABLE "matching_pairs" (
  "id" serial NOT NULL,
  "exercise_id" integer NOT NULL,
  "aymara_word" varchar(255) NOT NULL,
  "spanish_word" varchar(255) NOT NULL
);

-- Tabla: multiple_choice_options
DROP TABLE IF EXISTS "multiple_choice_options" CASCADE;
CREATE TABLE "multiple_choice_options" (
  "id" serial NOT NULL,
  "exercise_id" integer NOT NULL,
  "option_text" varchar(255) DEFAULT NULL,
  "option_image" varchar(255) DEFAULT NULL,
  "is_correct" boolean NOT NULL
);

-- Tabla: search_history
DROP TABLE IF EXISTS "search_history" CASCADE;
CREATE TABLE "search_history" (
  "id" serial NOT NULL,
  "headword" varchar(100) NOT NULL,
  "gloss" varchar(255) NOT NULL,
  "search_date" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: statistics_aggregated
DROP TABLE IF EXISTS "statistics_aggregated" CASCADE;
CREATE TABLE "statistics_aggregated" (
  "id" serial NOT NULL,
  "user_id" integer DEFAULT NULL,
  "exercise_id" integer DEFAULT NULL,
  "lesson_id" integer DEFAULT NULL,
  "curso_id" integer DEFAULT NULL,
  "stat_type" statistics_aggregated_stat_type_enum NOT NULL,
  "total_attempts" integer DEFAULT 0,
  "successful_attempts" integer DEFAULT 0,
  "failed_attempts" integer DEFAULT 0,
  "average_score" numeric(5,2) DEFAULT 0.00,
  "average_time" numeric(10,2) DEFAULT 0.00,
  "most_common_error" varchar(100) DEFAULT NULL,
  "error_pattern" text DEFAULT NULL,
  "difficulty_score" numeric(5,2) DEFAULT 0.00,
  "neural_network_score" numeric(5,2) DEFAULT 0.00,
  "predicted_difficulty" statistics_aggregated_predicted_difficulty_enum DEFAULT 'medio',
  "last_calculated" timestamp DEFAULT CURRENT_TIMESTAMP,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: topic_readings
DROP TABLE IF EXISTS "topic_readings" CASCADE;
CREATE TABLE "topic_readings" (
  "id" serial NOT NULL,
  "user_id" integer NOT NULL,
  "topic_id" integer NOT NULL,
  "lesson_id" integer NOT NULL,
  "exercise_id" integer DEFAULT NULL,
  "reading_completed" boolean DEFAULT false,
  "reading_started_at" timestamp DEFAULT NULL,
  "reading_completed_at" timestamp DEFAULT NULL,
  "time_spent" integer DEFAULT 0,
  "forced_by_failures" boolean DEFAULT false,
  "failure_count" integer DEFAULT 0,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: user_ar_cards
DROP TABLE IF EXISTS "user_ar_cards" CASCADE;
CREATE TABLE "user_ar_cards" (
  "id" serial NOT NULL,
  "user_id" integer NOT NULL,
  "ar_card_id" integer NOT NULL,
  "unlocked_at" timestamp DEFAULT CURRENT_TIMESTAMP,
  "unlocked_by" user_ar_cards_unlocked_by_enum DEFAULT 'lesson',
  "source_id" integer DEFAULT NULL
);

COMMENT ON COLUMN "user_ar_cards"."source_id" IS 'ID de la lección o examen que desbloqueó la tarjeta';

-- Tabla: user_attempts
DROP TABLE IF EXISTS "user_attempts" CASCADE;
CREATE TABLE "user_attempts" (
  "id" serial NOT NULL,
  "user_id" integer NOT NULL,
  "lesson_id" integer NOT NULL,
  "attempt_no" integer NOT NULL,
  "score" integer NOT NULL,
  "errors" integer NOT NULL,
  "streak" integer NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: user_attempt_details
DROP TABLE IF EXISTS "user_attempt_details" CASCADE;
CREATE TABLE "user_attempt_details" (
  "id" serial NOT NULL,
  "attempt_id" integer NOT NULL,
  "exercise_id" integer NOT NULL,
  "question_text" text DEFAULT NULL,
  "user_answer" text DEFAULT NULL,
  "correct_answer" text DEFAULT NULL,
  "is_correct" boolean DEFAULT NULL,
  "time_spent" integer DEFAULT 0,
  "difficulty_level" user_attempt_details_difficulty_level_enum DEFAULT 'medio',
  "error_type" varchar(100) DEFAULT NULL,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
  "exercise_type" varchar(50) DEFAULT NULL,
  "user_answer_time" timestamp DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: user_progress
DROP TABLE IF EXISTS "user_progress" CASCADE;
CREATE TABLE "user_progress" (
  "id" serial NOT NULL,
  "user_id" integer NOT NULL,
  "lesson_id" integer NOT NULL,
  "exercise_id" integer DEFAULT NULL,
  "date" date NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "errors" integer DEFAULT 0,
  "score" integer DEFAULT 0,
  "streak" integer DEFAULT 0,
  "current_index" integer NOT NULL DEFAULT 0,
  "total_exercises" integer NOT NULL DEFAULT 0,
  "in_progress" boolean NOT NULL DEFAULT false,
  "last_seen_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "attempt_no" smallint NOT NULL DEFAULT 1,
  "completed" boolean NOT NULL DEFAULT false,
  "attempts" integer DEFAULT 1,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
  "last_exit_at" timestamp DEFAULT NULL
);

-- Tabla: usuarios
DROP TABLE IF EXISTS "usuarios" CASCADE;
CREATE TABLE "usuarios" (
  "id" serial NOT NULL,
  "username" varchar(50) NOT NULL,
  "password" varchar(255) NOT NULL,
  "role" usuarios_role_enum NOT NULL,
  "activo" boolean NOT NULL DEFAULT true,
  "email" varchar(100) DEFAULT NULL,
  "curso" integer NOT NULL
);

-- ------------------------------------------------------------
-- Datos
-- ------------------------------------------------------------

INSERT INTO "access_logs" ("id", "user_id", "email", "username", "action", "path", "method", "ip", "user_agent", "status", "message", "created_at") VALUES
(1, 3, 'Admin@gmail.com', 'Admin', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Inicio de sesión correcto', '2025-08-22 16:46:26'),
(2, 3, 'Admin@gmail.com', 'Admin', 'logout', '/aymara/logout.php', 'GET', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Cierre de sesión', '2025-08-22 16:48:05'),
(3, 1, 'abraham@gmail.com', 'Abraham', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Inicio de sesión correcto', '2025-08-22 16:48:13'),
(4, 1, 'abraham@gmail.com', 'Abraham', 'logout', '/aymara/logout.php', 'GET', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Cierre de sesión', '2025-08-22 16:48:40'),
(5, 3, 'Admin@gmail.com', 'Admin', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Inicio de sesión correcto', '2025-08-22 16:51:21'),
(6, 3, 'Admin@gmail.com', 'Admin', 'logout', '/aymara/logout.php', 'GET', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Cierre de sesión', '2025-08-22 16:58:39'),
(7, 3, 'Admin@gmail.com', 'Admin', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Inicio de sesión correcto', '2025-08-22 16:58:45'),
(8, 3, 'Admin@gmail.com', 'Admin', 'logout', '/aymara/logout.php', 'GET', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Cierre de sesión', '2025-08-22 16:59:55'),
(9, 3, 'Admin@gmail.com', 'Admin', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Inicio de sesión correcto', '2025-08-22 17:00:01'),
(10, 3, 'Admin@gmail.com', 'Admin', 'logout', '/aymara/logout.php', 'GET', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Cierre de sesión', '2025-08-22 17:00:47'),
(11, NULL, NULL, 'Abraham', 'login_failed', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 401, 'Credenciales inválidas', '2025-08-22 17:00:53'),
(12, NULL, NULL, 'Abraham', 'login_failed', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 401, 'Credenciales inválidas', '2025-08-22 17:00:58'),
(13, 3, 'Admin@gmail.com', 'Admin', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Inicio de sesión correcto', '2025-08-22 17:01:06'),
(14, 3, 'Admin@gmail.com', 'Admin', 'view', '/aymara/ejercicios/tema_personas_gramaticales.php?lesson_id=2', 'GET', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Vio Tema 2 - Personas gramaticales', '2025-08-22 17:37:05'),
(15, 3, 'Admin@gmail.com', 'Admin', 'view', '/aymara/ejercicios/tema_personas_gramaticales.php?lesson_id=2', 'GET', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Vio Tema 2 - Personas gramaticales', '2025-08-22 17:38:47'),
(16, 3, 'Admin@gmail.com', 'Admin', 'view', '/aymara/ejercicios/tema_personas_gramaticales.php?lesson_id=2', 'GET', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Vio Tema 2 - Personas gramaticales', '2025-08-22 17:42:30'),
(17, 3, 'Admin@gmail.com', 'Admin', 'logout', '/aymara/logout.php', 'GET', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Cierre de sesión', '2025-08-22 18:12:04'),
(18, 3, 'Admin@gmail.com', 'Admin', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Inicio de sesión correcto', '2025-08-23 00:19:46'),
(19, 3, 'Admin@gmail.com', 'Admin', 'logout', '/aymara/logout.php', 'GET', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Cierre de sesión', '2025-08-23 00:21:56'),
(20, 3, 'Admin@gmail.com', 'Admin', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Inicio de sesión correcto', '2025-08-23 00:26:47'),
(21, 3, 'Admin@gmail.com', 'Admin', 'logout', '/aymara/logout.php', 'GET', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Cierre de sesión', '2025-08-28 16:12:57'),
(22, 3, 'Admin@gmail.com', 'Admin', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Inicio de sesión correcto', '2025-08-28 16:13:05'),
(23, 3, 'Admin@gmail.com', 'Admin', 'logout', '/aymara/logout.php', 'GET', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Cierre de sesión', '2025-08-28 16:55:33'),
(24, 3, 'Admin@gmail.com', 'Admin', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Inicio de sesión correcto', '2025-08-28 16:55:40'),
(25, 3, 'Admin@gmail.com', 'Admin', 'logout', '/aymara/logout.php', 'GET', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Cierre de sesión', '2025-08-28 16:56:22'),
(26, 15, NULL, 'Junior', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Inicio de sesión correcto', '2025-08-28 16:56:29'),
(27, 15, NULL, 'Junior', 'logout', '/aymara/logout.php', 'GET', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Cierre de sesión', '2025-08-28 16:58:41'),
(28, 14, NULL, 'Alfalfa', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Inicio de sesión correcto', '2025-08-28 16:58:49'),
(29, 14, NULL, 'Alfalfa', 'logout', '/aymara/logout.php', 'GET', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Cierre de sesión', '2025-08-28 18:15:46'),
(30, 15, NULL, 'Junior', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Inicio de sesión correcto', '2025-08-28 18:15:53'),
(31, 15, NULL, 'Junior', 'logout', '/aymara/logout.php', 'GET', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Cierre de sesión', '2025-08-28 18:16:13'),
(32, 3, 'Admin@gmail.com', 'Admin', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Inicio de sesión correcto', '2025-08-28 18:16:21'),
(33, 3, 'Admin@gmail.com', 'Admin', 'logout', '/aymara/logout.php', 'GET', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Cierre de sesión', '2025-08-28 18:17:10'),
(34, NULL, NULL, 'Horacio', 'login_failed', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 401, 'Credenciales inválidas', '2025-08-28 18:17:17'),
(35, 17, NULL, 'Horacio', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Inicio de sesión correcto', '2025-08-28 18:17:22'),
(36, 17, NULL, 'Horacio', 'logout', '/aymara/logout.php', 'GET', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Cierre de sesión', '2025-08-28 18:24:54'),
(37, 3, 'Admin@gmail.com', 'Admin', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Inicio de sesión correcto', '2025-08-28 18:25:00'),
(38, 3, 'Admin@gmail.com', 'Admin', 'logout', '/aymara/logout.php', 'GET', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Cierre de sesión', '2025-08-28 18:25:15'),
(39, 14, NULL, 'Alfalfa', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Inicio de sesión correcto', '2025-08-28 18:25:24'),
(40, 14, NULL, 'Alfalfa', 'logout', '/aymara/logout.php', 'GET', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Cierre de sesión', '2025-08-28 18:25:38'),
(41, 15, NULL, 'Junior', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Inicio de sesión correcto', '2025-08-28 18:25:49'),
(42, 15, NULL, 'Junior', 'logout', '/aymara/logout.php', 'GET', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Cierre de sesión', '2025-08-28 18:33:11'),
(43, 14, NULL, 'Alfalfa', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Inicio de sesión correcto', '2025-08-28 18:33:21'),
(44, 14, NULL, 'Alfalfa', 'logout', '/aymara/logout.php', 'GET', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Cierre de sesión', '2025-08-28 19:01:23'),
(45, 14, NULL, 'Alfalfa', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Inicio de sesión correcto', '2025-08-28 19:01:32'),
(46, 14, NULL, 'Alfalfa', 'logout', '/aymara/logout.php', 'GET', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Cierre de sesión', '2025-08-28 19:04:38'),
(47, 3, 'Admin@gmail.com', 'Admin', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Inicio de sesión correcto', '2025-08-28 19:04:45'),
(48, 3, 'Admin@gmail.com', 'Admin', 'logout', '/aymara/logout.php', 'GET', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Cierre de sesión', '2025-08-28 19:05:39'),
(49, 14, NULL, 'Alfalfa', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Inicio de sesión correcto', '2025-08-28 19:05:46'),
(50, 14, NULL, 'Alfalfa', 'logout', '/aymara/logout.php', 'GET', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Cierre de sesión', '2025-08-28 19:14:13'),
(51, 3, 'Admin@gmail.com', 'Admin', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Inicio de sesión correcto', '2025-08-28 19:14:19'),
(52, 3, 'Admin@gmail.com', 'Admin', 'logout', '/aymara/logout.php', 'GET', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Cierre de sesión', '2025-08-28 19:14:48'),
(53, NULL, NULL, 'Cleopatra', 'login_failed', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 404, 'Usuario no encontrado o inactivo', '2025-08-28 19:14:57'),
(54, 3, 'Admin@gmail.com', 'Admin', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Inicio de sesión correcto', '2025-08-28 19:15:07'),
(55, 3, 'Admin@gmail.com', 'Admin', 'logout', '/aymara/logout.php', 'GET', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Cierre de sesión', '2025-08-28 19:16:04'),
(56, 18, NULL, 'Cleopatra', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Inicio de sesión correcto', '2025-08-28 19:16:10'),
(57, 18, NULL, 'Cleopatra', 'logout', '/aymara/logout.php', 'GET', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Cierre de sesión', '2025-08-28 19:29:21'),
(58, 10, NULL, 'Nadie', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Inicio de sesión correcto', '2025-08-28 19:29:27'),
(59, 10, NULL, 'Nadie', 'logout', '/aymara/logout.php', 'GET', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Cierre de sesión', '2025-08-28 19:53:14'),
(60, 10, NULL, 'Nadie', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Inicio de sesión correcto', '2025-08-28 19:53:21'),
(61, 10, NULL, 'Nadie', 'logout', '/aymara/logout.php', 'GET', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Cierre de sesión', '2025-08-28 20:08:18'),
(62, 3, 'Admin@gmail.com', 'Admin', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Inicio de sesión correcto', '2025-08-28 20:08:25'),
(63, 3, 'Admin@gmail.com', 'Admin', 'logout', '/aymara/logout.php', 'GET', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Cierre de sesión', '2025-08-28 20:08:34'),
(64, NULL, NULL, 'Daniel', 'login_failed', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 401, 'Credenciales inválidas', '2025-08-28 20:08:40'),
(65, 3, 'Admin@gmail.com', 'Admin', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Inicio de sesión correcto', '2025-08-28 20:08:52'),
(66, 3, 'Admin@gmail.com', 'Admin', 'logout', '/aymara/logout.php', 'GET', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Cierre de sesión', '2025-08-28 20:09:16'),
(67, 19, NULL, 'Rasputin', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Inicio de sesión correcto', '2025-08-28 20:09:23'),
(68, 19, NULL, 'Rasputin', 'logout', '/aymara/logout.php', 'GET', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Cierre de sesión', '2025-08-28 20:21:03'),
(69, 3, 'Admin@gmail.com', 'Admin', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Inicio de sesión correcto', '2025-08-28 20:21:10'),
(70, 3, 'Admin@gmail.com', 'Admin', 'logout', '/aymara/logout.php', 'GET', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Cierre de sesión', '2025-08-28 20:21:55'),
(71, 20, NULL, 'Gerundio', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Inicio de sesión correcto', '2025-08-28 20:22:02'),
(72, 20, NULL, 'Gerundio', 'logout', '/aymara/logout.php', 'GET', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Cierre de sesión', '2025-08-28 20:51:49'),
(73, 3, 'Admin@gmail.com', 'Admin', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Inicio de sesión correcto', '2025-08-28 20:51:57'),
(74, 3, 'Admin@gmail.com', 'Admin', 'logout', '/aymara/logout.php', 'GET', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Cierre de sesión', '2025-08-28 20:52:18'),
(75, 21, NULL, 'Marco', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Inicio de sesión correcto', '2025-08-28 20:52:24'),
(76, 21, NULL, 'Marco', 'logout', '/aymara/logout.php', 'GET', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Cierre de sesión', '2025-08-28 21:22:32'),
(77, 3, 'Admin@gmail.com', 'Admin', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Inicio de sesión correcto', '2025-08-28 21:22:39'),
(78, 3, 'Admin@gmail.com', 'Admin', 'logout', '/aymara/logout.php', 'GET', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Cierre de sesión', '2025-08-28 21:23:00'),
(79, 22, NULL, 'Elvira', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Inicio de sesión correcto', '2025-08-28 21:23:07'),
(80, 22, NULL, 'Elvira', 'logout', '/aymara/logout.php', 'GET', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Cierre de sesión', '2025-08-28 21:49:58'),
(81, 3, 'Admin@gmail.com', 'Admin', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Inicio de sesión correcto', '2025-08-28 21:50:03'),
(82, 3, 'Admin@gmail.com', 'Admin', 'logout', '/aymara/logout.php', 'GET', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Cierre de sesión', '2025-08-28 21:50:34'),
(83, 23, NULL, 'Hermes', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Inicio de sesión correcto', '2025-08-28 21:50:40'),
(84, 23, NULL, 'Hermes', 'logout', '/aymara/logout.php', 'GET', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Cierre de sesión', '2025-08-28 21:59:44'),
(85, 3, 'Admin@gmail.com', 'Admin', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Inicio de sesión correcto', '2025-08-28 21:59:50'),
(86, 3, 'Admin@gmail.com', 'Admin', 'logout', '/aymara/logout.php', 'GET', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Cierre de sesión', '2025-08-28 22:00:13'),
(87, 24, NULL, 'Zeus', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Inicio de sesión correcto', '2025-08-28 22:00:19'),
(88, 24, NULL, 'Zeus', 'logout', '/aymara/logout.php', 'GET', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Cierre de sesión', '2025-08-28 22:04:07'),
(89, 25, NULL, 'Hades', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Inicio de sesión correcto', '2025-08-28 22:04:13'),
(90, 25, NULL, 'Hades', 'logout', '/aymara/logout.php', 'GET', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Cierre de sesión', '2025-08-28 22:07:30'),
(91, 3, 'Admin@gmail.com', 'Admin', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Inicio de sesión correcto', '2025-08-28 22:07:36'),
(92, 3, 'Admin@gmail.com', 'Admin', 'logout', '/aymara/logout.php', 'GET', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Cierre de sesión', '2025-08-28 22:07:51'),
(93, 26, NULL, 'Poseidon', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Inicio de sesión correcto', '2025-08-28 22:07:58'),
(94, 26, NULL, 'Poseidon', 'logout', '/aymara/logout.php', 'GET', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Cierre de sesión', '2025-08-28 22:16:35'),
(95, 25, NULL, 'Hades', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Inicio de sesión correcto', '2025-08-28 22:16:44'),
(96, 25, NULL, 'Hades', 'logout', '/aymara/logout.php', 'GET', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Cierre de sesión', '2025-08-28 22:17:08'),
(97, 18, NULL, 'Cleopatra', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Inicio de sesión correcto', '2025-08-29 02:37:49'),
(98, 18, NULL, 'Cleopatra', 'logout', '/aymara/logout.php', 'GET', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Cierre de sesión', '2025-08-29 04:35:31'),
(99, 3, 'Admin@gmail.com', 'Admin', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Inicio de sesión correcto', '2025-08-29 04:35:39'),
(100, 3, 'Admin@gmail.com', 'Admin', 'logout', '/aymara/logout.php', 'GET', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Cierre de sesión', '2025-08-29 04:38:58'),
(101, 3, 'Admin@gmail.com', 'Admin', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Inicio de sesión correcto', '2025-08-29 04:45:26'),
(102, 3, 'Admin@gmail.com', 'Admin', 'logout', '/aymara/logout.php', 'GET', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Cierre de sesión', '2025-08-29 23:05:32'),
(103, 3, 'Admin@gmail.com', 'Admin', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Inicio de sesión correcto', '2025-08-29 23:05:43'),
(104, 3, 'Admin@gmail.com', 'Admin', 'logout', '/aymara/logout.php', 'GET', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Cierre de sesión', '2025-08-29 23:07:00'),
(105, 18, NULL, 'Cleopatra', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Inicio de sesión correcto', '2025-08-29 23:07:15'),
(106, 27, NULL, 'Alvin', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Inicio de sesión correcto', '2025-08-29 23:35:03'),
(107, 27, NULL, 'Alvin', 'logout', '/aymara/logout.php', 'GET', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Cierre de sesión', '2025-08-29 23:36:17'),
(108, 28, NULL, 'Mauricio', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 OPR/120.0.0.0', 200, 'Inicio de sesión correcto', '2025-08-29 23:36:28'),
(109, 3, 'Admin@gmail.com', 'Admin', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0', 200, 'Inicio de sesión correcto', '2025-09-04 22:36:48'),
(110, NULL, NULL, 'admin', 'login_failed', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0', 401, 'Credenciales inválidas', '2025-09-05 06:47:11'),
(111, 3, 'Admin@gmail.com', 'Admin', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0', 200, 'Inicio de sesión correcto', '2025-09-05 06:47:20'),
(112, NULL, NULL, 'admin', 'login_failed', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0', 401, 'Credenciales inválidas', '2025-09-05 07:26:06'),
(113, 3, 'Admin@gmail.com', 'Admin', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0', 200, 'Inicio de sesión correcto', '2025-09-05 07:26:19'),
(114, NULL, NULL, 'Abraham', 'login_failed', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0', 401, 'Credenciales inválidas', '2025-09-26 06:41:53'),
(115, 1, 'abraham@gmail.com', 'Abraham', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0', 200, 'Inicio de sesión correcto', '2025-09-26 06:41:59'),
(116, 1, 'abraham@gmail.com', 'Abraham', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0', 200, 'Inicio de sesión correcto', '2025-09-26 10:05:42'),
(117, 1, 'abraham@gmail.com', 'Abraham', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0', 200, 'Inicio de sesión correcto', '2025-09-26 14:39:44'),
(118, 1, 'abraham@gmail.com', 'Abraham', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0', 200, 'Inicio de sesión correcto', '2025-09-26 21:34:07'),
(119, 1, 'abraham@gmail.com', 'Abraham', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0', 200, 'Inicio de sesión correcto', '2025-09-26 22:57:49'),
(120, 1, 'abraham@gmail.com', 'Abraham', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0', 200, 'Inicio de sesión correcto', '2025-10-03 07:19:54'),
(121, 1, 'abraham@gmail.com', 'Abraham', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0', 200, 'Inicio de sesión correcto', '2025-10-03 09:03:15'),
(122, 1, 'abraham@gmail.com', 'Abraham', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', 200, 'Inicio de sesión correcto', '2025-10-11 00:01:08'),
(123, NULL, NULL, 'Abraham', 'login_failed', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', 401, 'Credenciales inválidas', '2025-10-24 16:13:12'),
(124, 1, 'abraham@gmail.com', 'Abraham', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', 200, 'Inicio de sesión correcto', '2025-10-24 16:13:21'),
(125, 1, 'abraham@gmail.com', 'Abraham', 'logout', '/aymara/logout.php', 'GET', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', 200, 'Cierre de sesión', '2025-10-24 16:13:35'),
(126, 3, 'Admin@gmail.com', 'Admin', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', 200, 'Inicio de sesión correcto', '2025-10-24 16:13:52'),
(127, 1, 'abraham@gmail.com', 'Abraham', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', 200, 'Inicio de sesión correcto', '2025-10-24 16:34:59'),
(128, 1, 'abraham@gmail.com', 'Abraham', 'logout', '/aymara/logout.php', 'GET', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', 200, 'Cierre de sesión', '2025-10-24 17:52:33'),
(129, 1, 'abraham@gmail.com', 'Abraham', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', 200, 'Inicio de sesión correcto', '2025-10-24 21:05:53'),
(130, 1, 'abraham@gmail.com', 'Abraham', 'logout', '/aymara/logout.php', 'GET', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', 200, 'Cierre de sesión', '2025-10-24 22:02:39'),
(131, NULL, NULL, 'Abraham', 'login_failed', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', 401, 'Credenciales inválidas', '2025-10-24 22:04:56'),
(132, 1, 'abraham@gmail.com', 'Abraham', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', 200, 'Inicio de sesión correcto', '2025-10-24 22:05:07'),
(133, 1, 'abraham@gmail.com', 'Abraham', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', 200, 'Inicio de sesión correcto', '2025-10-24 22:06:32'),
(134, NULL, NULL, 'Abraham', 'login_failed', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', 401, 'Credenciales inválidas', '2025-10-24 22:15:52'),
(135, 1, 'abraham@gmail.com', 'Abraham', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', 200, 'Inicio de sesión correcto', '2025-10-24 22:16:07'),
(136, 1, 'abraham@gmail.com', 'Abraham', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0', 200, 'Inicio de sesión correcto', '2025-11-07 23:47:01'),
(137, 1, 'abraham@gmail.com', 'Abraham', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0', 200, 'Inicio de sesión correcto', '2025-11-07 23:48:13'),
(138, 1, 'abraham@gmail.com', 'Abraham', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0', 200, 'Inicio de sesión correcto', '2025-11-07 23:48:37'),
(139, 1, 'abraham@gmail.com', 'Abraham', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0', 200, 'Inicio de sesión correcto', '2025-11-07 23:50:44'),
(140, 1, 'abraham@gmail.com', 'Abraham', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0', 200, 'Inicio de sesión correcto', '2025-11-07 23:51:50'),
(141, 1, 'abraham@gmail.com', 'Abraham', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0', 200, 'Inicio de sesión correcto', '2025-11-07 23:53:00'),
(142, 1, 'abraham@gmail.com', 'Abraham', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0', 200, 'Inicio de sesión correcto', '2025-11-07 23:58:15'),
(143, 1, 'abraham@gmail.com', 'Abraham', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0', 200, 'Inicio de sesión correcto', '2025-11-07 23:59:53'),
(144, 1, 'abraham@gmail.com', 'Abraham', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0', 200, 'Inicio de sesión correcto', '2025-11-08 00:00:52'),
(145, 1, 'abraham@gmail.com', 'Abraham', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0', 200, 'Inicio de sesión correcto', '2025-11-08 00:07:31'),
(146, 1, 'abraham@gmail.com', 'Abraham', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0', 200, 'Inicio de sesión correcto', '2025-11-08 00:23:34'),
(147, 1, 'abraham@gmail.com', 'Abraham', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0', 200, 'Inicio de sesión correcto', '2025-11-08 00:24:06'),
(148, 1, 'abraham@gmail.com', 'Abraham', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0', 200, 'Inicio de sesión correcto', '2025-11-08 00:29:05'),
(149, 1, 'abraham@gmail.com', 'Abraham', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 200, 'Inicio de sesión correcto', '2025-11-08 00:29:34'),
(150, 1, 'abraham@gmail.com', 'Abraham', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0', 200, 'Inicio de sesión correcto', '2025-11-08 00:50:08'),
(151, 1, 'abraham@gmail.com', 'Abraham', 'login_success', '/aymara/login.php', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0', 200, 'Inicio de sesión correcto', '2025-12-03 08:45:02'),
(152, 1, 'abraham@gmail.com', 'Abraham', 'login_success', '/aym_old/old%20aym/index.php?action=login_post', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0', 200, 'Inicio de sesión correcto', '2025-12-04 00:50:04'),
(153, 1, 'abraham@gmail.com', 'Abraham', 'login_success', '/aym_old/old%20aym/index.php?action=login_post', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0', 200, 'Inicio de sesión correcto', '2025-12-04 00:53:56'),
(154, 2, 'Miguel@gmail.com', 'Miguel', 'login_success', '/aym_old/old%20aym/index.php?action=login_post', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0', 200, 'Inicio de sesión correcto', '2025-12-04 01:28:30'),
(155, 1, 'abraham@gmail.com', 'Abraham', 'login_success', '/aym_old/old%20aym/index.php?action=login_post', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0', 200, 'Inicio de sesión correcto', '2025-12-04 23:59:30'),
(156, 1, 'abraham@gmail.com', 'Abraham', 'login_success', '/aym_old/old%20aym/index.php?action=login_post', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', 200, 'Inicio de sesión correcto', '2025-12-09 08:17:33'),
(157, 2, 'Miguel@gmail.com', 'Miguel', 'login_success', '/aym_old/old%20aym/index.php?action=login_post', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', 200, 'Inicio de sesión correcto', '2025-12-09 08:18:52'),
(158, NULL, NULL, 'AbrahamMiguel', 'login_failed', '/aym_old/old%20aym/index.php?action=login_post', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', 401, 'Credenciales inválidas', '2025-12-09 08:20:52'),
(159, 1, 'abraham@gmail.com', 'Abraham', 'login_success', '/aym_old/old%20aym/index.php?action=login_post', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', 200, 'Inicio de sesión correcto', '2025-12-09 08:21:15'),
(160, 2, 'Miguel@gmail.com', 'Miguel', 'login_success', '/aym_old/old%20aym/index.php?action=login_post', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', 200, 'Inicio de sesión correcto', '2025-12-09 08:28:23'),
(161, NULL, NULL, 'Eliminar archivos anteriores/duplicados (p.ej. connect.html, Ejercicios/lessons.php, etc.) tras confirmar qué ya no se usa. Homologar arcard/view.php al layout si se desea, aunque es pantall', 'login_failed', '/aym_old/old%20aym/index.php?action=login_post', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', 401, 'Credenciales inválidas', '2025-12-09 08:33:01'),
(162, 1, 'abraham@gmail.com', 'Abraham', 'login_success', '/aym_old/old%20aym/index.php?action=login_post', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', 200, 'Inicio de sesión correcto', '2025-12-09 08:33:27'),
(163, 1, 'abraham@gmail.com', 'Abraham', 'login_success', '/aym_old/aymara/index.php?action=login_post', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', 200, 'Inicio de sesión correcto', '2025-12-09 08:56:27'),
(164, 1, 'abraham@gmail.com', 'Abraham', 'login_success', '/aym_old/aymara/index.php?action=login_post', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', 200, 'Inicio de sesión correcto', '2025-12-09 08:59:20'),
(165, 2, 'Miguel@gmail.com', 'Miguel', 'login_success', '/aym_old/aymara/index.php?action=login_post', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', 200, 'Inicio de sesión correcto', '2025-12-09 09:00:21'),
(166, 2, 'Miguel@gmail.com', 'Miguel', 'login_success', '/aym_old/aymara/index.php?action=login_post', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', 200, 'Inicio de sesión correcto', '2025-12-09 09:46:45'),
(167, 1, 'abraham@gmail.com', 'Abraham', 'login_success', '/aym_old/aymara/index.php?action=login_post', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', 200, 'Inicio de sesión correcto', '2025-12-11 08:49:22'),
(168, 2, 'Miguel@gmail.com', 'Miguel', 'login_success', '/aym_old/aymara/index.php?action=login_post', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', 200, 'Inicio de sesión correcto', '2025-12-11 09:00:58'),
(169, 1, 'abraham@gmail.com', 'Abraham', 'login_success', '/aym_old/aymara/index.php?action=login_post', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', 200, 'Inicio de sesión correcto', '2025-12-11 09:11:13'),
(170, 1, 'abraham@gmail.com', 'Abraham', 'login_success', '/aym_old/aymara/index.php?action=login_post', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', 200, 'Inicio de sesión correcto', '2025-12-11 10:13:49'),
(171, 1, 'abraham@gmail.com', 'Abraham', 'login_success', '/aym_old/aymara/index.php?action=login_post', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', 200, 'Inicio de sesión correcto', '2025-12-11 10:36:52'),
(172, 1, 'abraham@gmail.com', 'Abraham', 'login_success', '/aym_old/aymara/index.php?action=login_post', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', 200, 'Inicio de sesión correcto', '2025-12-12 08:40:29'),
(173, 3, 'Admin@gmail.com', 'Admin', 'login_success', '/aym_old/aymara/index.php?action=login_post', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', 200, 'Inicio de sesión correcto', '2025-12-12 09:11:23'),
(174, 1, 'abraham@gmail.com', 'Abraham', 'login_success', '/aym_old/aymara/index.php?action=login_post', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', 200, 'Inicio de sesión correcto', '2025-12-12 09:13:20'),
(175, 1, 'abraham@gmail.com', 'Abraham', 'login_success', '/aym_old/aymara/index.php?action=login_post', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', 200, 'Inicio de sesión correcto', '2025-12-13 21:54:55'),
(176, 1, 'abraham@gmail.com', 'Abraham', 'login_success', '/aym_old/aymara/index.php?action=login_post', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', 200, 'Inicio de sesión correcto', '2025-12-13 23:06:20'),
(177, 2, 'Miguel@gmail.com', 'Miguel', 'login_success', '/aym_old/aymara/index.php?action=login_post', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', 200, 'Inicio de sesión correcto', '2025-12-14 10:31:03'),
(178, 1, 'abraham@gmail.com', 'Abraham', 'login_success', '/aym_old/aymara/index.php?action=login_post', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', 200, 'Inicio de sesión correcto', '2025-12-14 21:32:40'),
(179, NULL, NULL, 'Abraham', 'login_failed', '/aym_old/aymara/index.php?action=login_post', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', 401, 'Credenciales inválidas', '2025-12-15 00:52:27'),
(180, 1, 'abraham@gmail.com', 'Abraham', 'login_success', '/aym_old/aymara/index.php?action=login_post', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', 200, 'Inicio de sesión correcto', '2025-12-15 00:52:39'),
(181, 1, 'abraham@gmail.com', 'Abraham', 'login_success', '/aym_old/aymara/index.php?action=login_post', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', 200, 'Inicio de sesión correcto', '2025-12-15 09:15:38'),
(182, 1, 'abraham@gmail.com', 'Abraham', 'login_success', '/aym_old/aymara/index.php?action=login_post', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', 200, 'Inicio de sesión correcto', '2025-12-15 11:07:08');
INSERT INTO "access_logs" ("id", "user_id", "email", "username", "action", "path", "method", "ip", "user_agent", "status", "message", "created_at") VALUES
(183, 1, 'abraham@gmail.com', 'Abraham', 'login_success', '/aym_old/aymara/index.php?action=login_post', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', 200, 'Inicio de sesión correcto', '2025-12-15 17:34:13'),
(184, 1, 'abraham@gmail.com', 'Abraham', 'login_success', '/aym_old/aymara/index.php?action=login_post', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', 200, 'Inicio de sesión correcto', '2025-12-15 17:40:52'),
(185, 1, 'abraham@gmail.com', 'Abraham', 'login_success', '/aym_old/aymara/index.php?action=login_post', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', 200, 'Inicio de sesión correcto', '2025-12-15 17:47:53'),
(186, 1, 'abraham@gmail.com', 'Abraham', 'login_success', '/aym_old/aymara/index.php?action=login_post', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', 200, 'Inicio de sesión correcto', '2025-12-16 03:14:30'),
(187, 1, 'abraham@gmail.com', 'Abraham', 'login_success', '/aym_old/aymara/index.php?action=login_post', 'POST', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', 200, 'Inicio de sesión correcto', '2025-12-18 18:08:02');
INSERT INTO "archivos" ("id", "nombre", "ruta", "uploaded_by", "fecha_subida", "activo", "curso") VALUES
(1, 'reporte_estudiante_Miguel_2025-12-15.pdf', 'uploads/reporte_estudiante_Miguel_2025-12-15.pdf', 1, '2025-12-15 17:48:10', true, 1);
INSERT INTO "ar_cards" ("id", "user_id", "created_by", "exercise_id", "lesson_id", "exam_id", "card_code", "title", "description", "marker_file", "card_data", "created_at", "unlocked_at", "is_unlocked", "activo", "unlock_type", "unlock_exam_id") VALUES
(1, NULL, 1, NULL, NULL, NULL, 'AR00001765755122825', 'aaaa', 'aaaa', 'marker_AR00001765755122825.patt', NULL, '2025-12-14 19:32:02', '2025-12-14 19:32:02', true, true, 'lesson', NULL),
(2, NULL, 1, NULL, NULL, NULL, 'AR00001765755348141', 'bbbb', 'bbbb', 'marker_AR00001765755348141.patt', NULL, '2025-12-14 19:35:48', '2025-12-14 19:35:48', true, true, 'lesson', NULL),
(3, NULL, 1, NULL, NULL, NULL, 'AR00001765855406691', 'cccc', 'sfsaf', 'marker_AR00001765855406691.patt', NULL, '2025-12-15 23:23:26', '2025-12-15 23:23:26', true, true, 'lesson', NULL);
INSERT INTO "content_order" ("id", "curso_id", "content_type", "content_id", "orden", "created_at", "updated_at") VALUES
(1, 1, 'lesson', 1, 1, '2025-12-15 06:24:43', '2025-12-15 06:24:43'),
(2, 1, 'lesson', 2, 3, '2025-12-15 06:24:43', '2025-12-15 06:33:15'),
(3, 2, 'lesson', 3, 1, '2025-12-15 06:24:43', '2025-12-15 06:25:59'),
(4, 2, 'lesson', 4, 2, '2025-12-15 06:24:43', '2025-12-15 06:26:01'),
(8, 1, 'exam', 3, 2, '2025-12-15 06:24:43', '2025-12-15 06:33:17'),
(9, 1, 'exam', 5, 4, '2025-12-15 06:39:14', '2025-12-15 06:39:14');
INSERT INTO "curso" ("id_cur", "nombre", "id_doc") VALUES
(1, '1º sec', 1),
(2, '2º Sec', 1);
INSERT INTO "diccionario" ("id", "aymara", "espanol", "activo", "categoria", "curso") VALUES
(1, 'alwa', 'amanecer', true, '', NULL),
(2, 'ampara', 'mano', true, 'Cuerpo', NULL),
(3, 'anata', 'juego', true, '', NULL),
(4, 'ancha', 'mucho', true, '', NULL),
(5, 'añu', 'perro', true, 'Animal', NULL),
(6, 'aru', 'palabra', true, '', NULL),
(7, 'asaña', 'dormir', true, 'Actividad', NULL),
(8, 'atipaña', 'ganar', true, '', NULL),
(9, 'awicha', 'abuela', true, 'Familia', NULL),
(10, 'awki', 'abuelo', true, 'Familia', NULL),
(11, 'ch''ama', 'fuerza', true, '', NULL),
(12, 'ch''usi', 'frío', true, '', NULL),
(13, 'chaka', 'puente', true, '', NULL),
(14, 'ch''uxña', 'verde', true, '', NULL),
(15, 'ch''iqchi', 'sucio', true, '', NULL),
(16, 'ch''uwa', 'claro', true, '', NULL),
(17, 'chiq''i', 'mojado', true, '', NULL),
(18, 'chuqila', 'maní', true, '', NULL),
(19, 'ch''iji', 'seco', true, '', NULL),
(20, 'chuq''a', 'dulce', true, '', NULL),
(21, 'chiri', 'frío', true, '', NULL),
(22, 'ch''uqi', 'papa', true, '', NULL),
(23, 'ch''allwa', 'pescado', true, '', NULL),
(24, 'ch''amanchäwi', 'trabajo', true, '', NULL),
(25, 'chhuxla', 'enfermo', true, '', NULL),
(26, 'ch''usaqäwi', 'tristeza', true, '', NULL),
(27, 'chhuxk''äwi', 'obscuridad', true, '', NULL),
(28, 'chhiyara', 'amanecer', true, '', NULL),
(29, 'chhijña', 'despertar', true, '', NULL),
(30, 'ch''ukhu', 'negro', true, '', NULL),
(31, 'ch''uwa', 'limpio', true, '', NULL),
(32, 'chhichhi', 'gallina', true, '', NULL),
(33, 'chhupi', 'verde', true, '', NULL),
(34, 'chh''ulla', 'pálido', true, '', NULL),
(35, 'chh''ipita', 'rojo', true, '', NULL),
(36, 'chh''ajña', 'amarillo', true, '', NULL),
(37, 'chh''ajña', 'azul', true, '', NULL),
(38, 'chhupina', 'rosa', true, '', NULL),
(39, 'chh''ajchi', 'cordero', true, '', NULL),
(40, 'chh''ukhuna', 'vaca', true, '', NULL),
(41, 'chhajwa', 'montaña', true, '', NULL),
(42, 'chh''ojña', 'hierba', true, '', NULL),
(43, 'chh''ajña', 'flor', true, '', NULL),
(44, 'chhumpi', 'marrón', true, '', NULL),
(45, 'chhuchhuna', 'arena', true, '', NULL),
(46, 'chh''aja', 'polvo', true, '', NULL),
(47, 'chh''uma', 'agua', true, '', NULL),
(48, 'chhujña', 'rápido', true, '', NULL),
(49, 'chhullku', 'viejo', true, '', NULL),
(50, 'chhuyma', 'corazón', true, '', NULL),
(51, 'chhama', 'pierna', true, '', NULL),
(52, 'chhujña', 'sangre', true, '', NULL),
(53, 'chh''uma', 'río', true, '', NULL),
(54, 'chhuyña', 'largo', true, '', NULL),
(55, 'chhajwa', 'calor', true, '', NULL),
(56, 'chhuñuña', 'fuego', true, '', NULL),
(57, 'chhurura', 'tierra', true, '', NULL),
(58, 'chh''ajña', 'huevo', true, '', NULL),
(59, 'chhuchhuna', 'nieve', true, '', NULL),
(60, 'chh''ijña', 'luz', true, '', NULL),
(61, 'chhijlla', 'palo', true, '', NULL),
(62, 'chhucha', 'hoja', true, '', NULL),
(63, 'chh''uma', 'lluvia', true, '', NULL),
(64, 'chh''ila', 'estrella', true, '', NULL),
(65, 'chh''uxña', 'luna', true, '', NULL),
(66, 'chh''ajña', 'sol', true, '', NULL),
(67, 'chh''uku', 'tarde', true, '', NULL),
(68, 'chh''uqi', 'noche', true, '', NULL),
(69, 'chhuchhuna', 'polvo', true, '', NULL),
(70, 'chh''ajña', 'rojo', true, '', NULL),
(71, 'chhuxña', 'blanco', true, '', NULL),
(72, 'chhujña', 'carne', true, '', NULL),
(73, 'chhuxña', 'pan', true, '', NULL),
(74, 'chhujña', 'mesa', true, '', NULL),
(75, 'chhajña', 'silla', true, '', NULL),
(76, 'chhujña', 'casa', true, '', NULL),
(77, 'chh''ajña', 'puerta', true, '', NULL),
(78, 'chh''ichhila', 'ventana', true, '', NULL),
(79, 'chh''ajña', 'pared', true, '', NULL),
(80, 'chh''axña', 'techo', true, '', NULL),
(81, 'chh''ajña', 'piso', true, '', NULL),
(82, 'chhujña', 'llave', true, '', NULL),
(83, 'chhuchhuna', 'cerradura', true, '', NULL),
(84, 'chh''ajña', 'bolsa', true, '', NULL),
(85, 'chhuchhuna', 'caja', true, '', NULL),
(86, 'chh''ujña', 'plato', true, '', NULL),
(87, 'chh''ajña', 'taza', true, '', NULL),
(88, 'chhuxña', 'cuchara', true, '', NULL),
(89, 'chhujña', 'tenedor', true, '', NULL),
(90, 'chh''ajña', 'cuchillo', true, '', NULL),
(91, 'chh''ichhila', 'comida', true, '', NULL),
(92, 'chh''ajña', 'bebida', true, '', NULL),
(93, 'chhuxña', 'fruta', true, '', NULL),
(94, 'chhujña', 'verdura', true, '', NULL),
(95, 'chh''ajña', 'carne', true, '', NULL),
(96, 'chh''uchhuna', 'pescado', true, '', NULL),
(97, 'chh''ajña', 'pollo', true, '', NULL),
(98, 'chhuchhuna', 'cerdo', true, '', NULL),
(99, 'chh''ajña', 'vaca', true, '', NULL),
(100, 'chh''ajña', 'huevo', true, '', NULL),
(101, 'chhuchhuna', 'queso', true, '', NULL),
(102, 'chh''ajña', 'pan', true, '', NULL),
(103, 'chh''ajña', 'mantequilla', true, '', NULL),
(104, 'chh''ichhila', 'aceite', true, '', NULL),
(105, 'chh''ajña', 'sal', true, '', NULL),
(106, 'chhuchhuna', 'azúcar', true, '', NULL),
(107, 'chh''ajña', 'pimienta', true, '', NULL),
(108, 'chh''ajña', 'ajo', true, '', NULL),
(109, 'chh''ajña', 'cebolla', true, '', NULL),
(110, 'chh''ajña', 'tomate', true, '', NULL),
(111, 'chh''ajña', 'patata', true, '', NULL),
(112, 'chh''ajña', 'zanahoria', true, '', NULL),
(113, 'chh''ichhila', 'calabaza', true, '', NULL),
(114, 'chh''ajña', 'lechuga', true, '', NULL),
(115, 'chh''ajña', 'maíz', true, '', NULL),
(116, 'chh''ajña', 'arroz', true, '', NULL),
(117, 'chh''ajña', 'frijoles', true, '', NULL),
(118, 'chh''ajña', 'pasta', true, '', NULL),
(119, 'chh''ajña', 'pan', true, '', NULL),
(120, 'chh''ichhila', 'leche', true, '', NULL),
(121, 'chh''ajña', 'agua', true, '', NULL),
(122, 'chh''ajña', 'jugo', true, '', NULL),
(123, 'chh''ajña', 'té', true, '', NULL),
(124, 'chh''ajña', 'café', true, '', NULL),
(125, 'chh''ajña', 'cerveza', true, '', NULL),
(126, 'chh''ajña', 'vino', true, '', NULL),
(127, 'chh''ajña', 'licor', true, '', NULL),
(128, 'chh''ajña', 'jugo', true, '', NULL),
(129, 'chh''ajña', 'refresco', true, '', NULL),
(130, 'chh''ajña', 'hielo', true, '', NULL),
(131, 'chh''ajña', 'sopa', true, '', NULL),
(132, 'chh''ajña', 'ensalada', true, '', NULL),
(133, 'chh''ajña', 'postre', true, '', NULL),
(134, 'chh''ajña', 'helado', true, '', NULL),
(135, 'chh''ajña', 'pastel', true, '', NULL),
(136, 'chh''ajña', 'chocolate', true, '', NULL),
(137, 'chh''ajña', 'dulce', true, '', NULL),
(138, 'chh''ajña', 'caramelo', true, '', NULL),
(139, 'chh''ajña', 'galleta', true, '', NULL),
(140, 'chh''ajña', 'mermelada', true, '', NULL),
(141, 'chh''ajña', 'miel', true, '', NULL),
(142, 'chh''ajña', 'mantequilla', true, '', NULL),
(143, 'chh''ajña', 'yogur', true, '', NULL),
(144, 'chh''ajña', 'nata', true, '', NULL),
(145, 'chh''ajña', 'flan', true, '', NULL),
(146, 'chh''ajña', 'pudín', true, '', NULL),
(147, 'chh''ajña', 'natillas', true, '', NULL),
(148, 'chh''ajña', 'gelatina', true, '', NULL),
(149, 'chh''ajña', 'tarta', true, '', NULL),
(150, 'chh''ajña', 'bizcocho', true, '', NULL),
(151, 'chh''ajña', 'torta', true, '', NULL),
(152, 'chh''ajña', 'relleno', true, '', NULL),
(153, 'chh''ajña', 'compota', true, '', NULL),
(154, 'chh''ajña', 'salsa', true, '', NULL),
(155, 'chh''ajña', 'guarnición', true, '', NULL),
(156, 'chh''ajña', 'aderezo', true, '', NULL),
(157, 'chh''ajña', 'condimento', true, '', NULL),
(158, 'chh''ajña', 'especia', true, '', NULL),
(159, 'chh''ajña', 'hierba', true, '', NULL),
(160, 'chh''ajña', 'perejil', true, '', NULL),
(161, 'chh''ajña', 'albahaca', true, '', NULL),
(162, 'chh''ajña', 'orégano', true, '', NULL),
(163, 'chh''ajña', 'romero', true, '', NULL),
(164, 'chh''ajña', 'tomillo', true, '', NULL),
(165, 'chh''ajña', 'menta', true, '', NULL),
(166, 'chh''ajña', 'canela', true, '', NULL),
(167, 'chh''ajña', 'vainilla', true, '', NULL),
(168, 'chh''ajña', 'clavo', true, '', NULL),
(169, 'chh''ajña', 'jengibre', true, '', NULL),
(170, 'chh''ajña', 'mostaza', true, '', NULL),
(171, 'chh''ajña', 'mayonesa', true, '', NULL),
(172, 'chh''ajña', 'ketchup', true, '', NULL),
(173, 'chh''ajña', 'vinagre', true, '', NULL),
(174, 'chh''ajña', 'aceituna', true, '', NULL),
(175, 'chh''ajña', 'pepinillo', true, '', NULL),
(176, 'chh''ajña', 'almendra', true, '', NULL),
(177, 'chh''ajña', 'nuez', true, '', NULL),
(178, 'chh''ajña', 'avellana', true, '', NULL),
(179, 'chh''ajña', 'pistacho', true, '', NULL),
(180, 'chh''ajña', 'anacardo', true, '', NULL),
(181, 'chh''ajña', 'maní', true, '', NULL),
(182, 'chh''ajña', 'girasol', true, '', NULL),
(183, 'chh''ajña', 'amapola', true, '', NULL),
(184, 'chh''ajña', 'sésamo', true, '', NULL),
(185, 'chh''ajña', 'linaza', true, '', NULL),
(186, 'chh''ajña', 'chía', true, '', NULL),
(187, 'chh''ajña', 'calabaza', true, '', NULL),
(188, 'chh''ajña', 'girasol', true, '', NULL),
(189, 'chh''ajña', 'amapola', true, '', NULL),
(190, 'chh''ajña', 'sésamo', true, '', NULL),
(191, 'chh''ajña', 'linaza', true, '', NULL),
(192, 'chh''ajña', 'chía', true, '', NULL),
(193, 'chh''ajña', 'calabaza', true, '', NULL),
(194, 'chh''ajña', 'girasol', true, '', NULL),
(195, 'chh''ajña', 'amapola', true, '', NULL),
(196, 'chh''ajña', 'sésamo', true, '', NULL),
(197, 'chh''ajña', 'linaza', true, '', NULL),
(198, 'chh''ajña', 'chía', true, '', NULL),
(199, 'chh''ajña', 'calabaza', true, '', NULL),
(200, 'chh''ajña', 'girasol', true, '', NULL),
(201, 'chh''ajña', 'amapola', true, '', NULL),
(202, 'chh''ajña', 'sésamo', true, '', NULL),
(203, 'chh''ajña', 'linaza', true, '', NULL),
(204, 'chh''ajña', 'chía', true, '', NULL),
(205, 'chh''ajña', 'calabaza', true, '', NULL),
(206, 'chh''ajña', 'girasol', true, '', NULL),
(207, 'chh''ajña', 'amapola', true, '', NULL),
(208, 'chh''ajña', 'sésamo', true, '', NULL),
(209, 'chh''ajña', 'linaza', true, '', NULL),
(210, 'chh''ajña', 'chía', true, '', NULL),
(211, 'chh''ajña', 'calabaza', true, '', NULL),
(212, 'chh''ajña', 'girasol', true, '', NULL),
(213, 'chh''ajña', 'amapola', true, '', NULL),
(214, 'chh''ajña', 'sésamo', true, '', NULL),
(215, 'chh''ajña', 'linaza', true, '', NULL),
(216, 'chh''ajña', 'chía', true, '', NULL),
(217, 'chh''ajña', 'calabaza', true, '', NULL),
(218, 'chh''ajña', 'girasol', true, '', NULL),
(219, 'chh''ajña', 'amapola', true, '', NULL),
(220, 'chh''ajña', 'sésamo', true, '', NULL),
(221, 'chh''ajña', 'linaza', true, '', NULL),
(222, 'chh''ajña', 'chía', true, '', NULL),
(223, 'chh''ajña', 'calabaza', true, '', NULL),
(224, 'chh''ajña', 'girasol', true, '', NULL),
(225, 'chh''ajña', 'amapola', true, '', NULL),
(226, 'chh''ajña', 'sésamo', true, '', NULL),
(227, 'chh''ajña', 'linaza', true, '', NULL),
(228, 'chh''ajña', 'chía', true, '', NULL),
(229, 'chh''ajña', 'calabaza', true, '', NULL),
(230, 'chh''ajña', 'girasol', true, '', NULL),
(231, 'chh''ajña', 'amapola', true, '', NULL),
(232, 'achachila', 'ancestro', true, '', NULL),
(233, 'akaña', 'éste', true, '', NULL),
(234, 'alaxa', 'arriba', true, '', NULL),
(235, 'alkasiña', 'descansar', true, '', NULL),
(236, 'amaya', 'espíritu', true, '', NULL),
(237, 'amawta', 'sabio', true, '', NULL),
(238, 'anataña', 'jugar', true, '', NULL),
(239, 'anqara', 'sopa de quinua', true, '', NULL),
(240, 'api', 'bebida de maíz', true, '', NULL),
(241, 'apthapi', 'compartir comida', true, '', NULL),
(242, 'awicha', 'abuela', true, '', NULL),
(243, 'awki', 'abuelo', true, '', NULL),
(244, 'axullitu', 'comida típica', true, '', NULL),
(245, 'aya', 'difunto', true, '', NULL),
(246, 'aycha', 'carne', true, '', NULL),
(247, 'ayni', 'trabajo comunitario', true, '', NULL),
(248, 'chacha', 'hombre', true, '', NULL),
(249, 'chacha warmi', 'pareja', true, '', NULL),
(250, 'ch''alla', 'ritual de ofrenda', true, '', NULL),
(251, 'chhuxña', 'blanco', true, '', NULL),
(252, 'chuq''i', 'papa', true, '', NULL),
(253, 'ch''uspa', 'bolsa', true, '', NULL),
(254, 'jaqi', 'persona', true, '', NULL),
(255, 'japu', 'oreja', true, '', NULL),
(256, 'jichha', 'ahora', true, '', NULL),
(257, 'jisk''a', 'pequeño', true, '', NULL),
(258, 'jiwasa', 'nosotros', true, '', NULL),
(259, 'jucha', 'pecado', true, '', NULL),
(260, 'k''echi', 'hierba', true, '', NULL),
(261, 'k''isimira', 'estrella', true, '', NULL),
(262, 'k''uchu', 'esquina', true, '', NULL),
(263, 'kama', 'hasta', true, '', NULL),
(264, 'kamisa', 'saludos', true, '', NULL),
(265, 'kapu', 'sombrero', true, '', NULL),
(266, 'kari', 'varón', true, '', NULL),
(267, 'kasa', 'hombre', true, '', NULL),
(268, 'kawki', 'hermano', true, '', NULL),
(269, 'khunu', 'nieve', true, '', NULL),
(270, 'kipa', 'atrás', true, '', NULL),
(271, 'k''ullu', 'madera', true, '', NULL),
(272, 'k''usillu', 'mono', true, '', NULL),
(273, 'lawa', 'sopa de maíz', true, '', NULL),
(274, 'lluqu', 'izquierda', true, '', NULL),
(275, 'lupi', 'sol', true, '', NULL),
(276, 'machaqa', 'nuevo', true, '', NULL),
(277, 'maka', 'golpear', true, '', NULL),
(278, 'malku', 'montaña', true, '', NULL),
(279, 'mama', 'madre', true, '', NULL),
(280, 'mana', 'no', true, '', NULL),
(281, 'manq''a', 'comida', true, '', NULL),
(282, 'masi', 'compañero', true, '', NULL),
(283, 'mayja', 'diferente', true, '', NULL),
(284, 'maya', 'uno', true, '', NULL),
(285, 'mikhuna', 'alimento', true, '', NULL),
(286, 'misi', 'gato', true, '', NULL),
(287, 'munay', 'querer', true, '', NULL),
(288, 'munayni', 'quiero', true, '', NULL),
(289, 'munata', 'amado', true, '', NULL),
(290, 'nayra', 'ojo', true, '', NULL),
(291, 'ñanaka', 'nosotros', true, '', NULL),
(292, 'ñawi', 'rostro', true, '', NULL),
(293, 'ñuñu', 'pecho', true, '', NULL),
(294, 'p''iqi', 'cabeza', true, '', NULL),
(295, 'pacha', 'tiempo', true, '', NULL),
(296, 'pachakuti', 'ciclo', true, '', NULL),
(297, 'pampja', 'abajo', true, '', NULL),
(298, 'panka', 'hoja', true, '', NULL),
(299, 'paxi', 'luna', true, '', NULL),
(300, 'phaxi', 'mes', true, '', NULL),
(301, 'phuyu', 'nube', true, '', NULL),
(302, 'piqi', 'cabeza', true, '', NULL),
(303, 'puriña', 'caminar', true, '', NULL),
(304, 'pusña', 'cuatro', true, '', NULL),
(305, 'q''ala', 'desnudo', true, '', NULL),
(306, 'qhathu', 'mercado', true, '', NULL),
(307, 'qillqaña', 'escribir', true, '', NULL),
(308, 'qucha', 'lago', true, '', NULL),
(309, 'q''umu', 'codo', true, '', NULL),
(310, 'q''upi', 'corto', true, '', NULL),
(311, 'quta', 'lago', true, '', NULL),
(312, 'q''uwa', 'tabaco', true, '', NULL),
(313, 'riwa', 'canal', true, '', NULL),
(314, 'riwri', 'frente', true, '', NULL),
(315, 'saqi', 'sal', true, '', NULL),
(316, 'sasaña', 'cansarse', true, '', NULL),
(317, 'sata', 'nombre', true, '', NULL),
(318, 'sikuri', 'flautista', true, '', NULL),
(319, 'suma', 'bonito', true, '', NULL),
(320, 'suru', 'tobillo', true, '', NULL),
(321, 'taipa', 'lleno', true, '', NULL),
(322, 'tawa', 'cuatro', true, '', NULL),
(323, 'thakhina', 'caminata', true, '', NULL),
(324, 'thanta', 'viejo', true, '', NULL),
(325, 'tinku', 'encuentro', true, '', NULL),
(326, 'tiqi', 'semilla', true, '', NULL),
(327, 'titi', 'puma', true, '', NULL),
(328, 'tunta', 'papa deshidratada', true, '', NULL),
(329, 'tunka', 'diez', true, '', NULL),
(330, 'uch''uku', 'guardián', true, '', NULL),
(331, 'uñt''ata', 'aprendido', true, '', NULL),
(332, 'utjiri', 'creador', true, '', NULL),
(333, 'waka', 'vaca', true, '', NULL),
(334, 'wali', 'bien', true, '', NULL),
(335, 'waña', 'quemar', true, '', NULL),
(336, 'waqay', 'llorar', true, '', NULL),
(337, 'wawa', 'niño', true, '', NULL),
(338, 'wichay', 'arriba', true, '', NULL),
(339, 'wila', 'sangre', true, '', NULL),
(340, 'wilanchay', 'familia', true, '', NULL),
(341, 'wiqu', 'brazo', true, '', NULL),
(342, 'yaku', 'agua', true, '', NULL),
(343, 'yana', 'negro', true, '', NULL),
(344, 'yapu', 'tierra cultivable', true, '', NULL),
(345, 'yati', 'saber', true, '', NULL),
(346, 'yatichaña', 'enseñar', true, '', NULL),
(347, 'yatiña', 'conocer', true, '', NULL),
(348, 'yawa', 'helado', true, '', NULL),
(349, 'wayna', 'joven', true, '', NULL),
(350, 'yujra', 'pelo', true, '', NULL),
(351, 'yuli', 'amarillo', true, '', NULL),
(352, 'yuri', 'río', true, '', NULL),
(353, 'pay-suma', 'gracias', true, '', NULL),
(354, 'yuqalla', 'niño', true, '', NULL),
(355, 'aka', 'este', true, '', NULL),
(356, 'uka', 'aquel', true, '', NULL),
(357, 'pachamama', 'madre tierra', true, '', NULL),
(358, 'tata', 'padre', true, '', NULL),
(359, 'jaqi', 'gente', true, '', NULL),
(360, 'yatiña', 'saber', true, '', NULL),
(361, 'munasiña', 'amor', true, '', NULL),
(362, 'uñt''aña', 'aprender', true, '', NULL),
(363, 'jach''a uru', 'día grande', true, '', NULL),
(364, 'yatiqaña', 'estudiar', true, '', NULL),
(365, 'thakhi', 'camino', true, '', NULL),
(366, 'wawa', 'niño', true, '', NULL),
(367, 'warmi', 'mujer', true, '', NULL),
(368, 'chacha', 'hombre', true, '', NULL);
INSERT INTO "difficulty_levels" ("id", "level_code", "level_name", "points_multiplier", "time_multiplier", "created_at") VALUES
(1, 'facil', 'Fácil', '1.00', '1.50', '2025-12-11 06:03:53'),
(2, 'medio', 'Medio', '1.50', '1.00', '2025-12-11 06:03:53'),
(3, 'dificil', 'Difícil', '2.00', '0.75', '2025-12-11 06:03:53');
INSERT INTO "exams" ("id", "lesson_id", "position_order", "type", "title", "description", "time_limit", "start_date", "end_date", "min_score", "ar_card_id", "active", "created_by", "created_at", "updated_at") VALUES
(3, NULL, 2, 'conectar_palabras', 'Examen 1', 'Demostrar las palabras que conoce', 5, NULL, '2025-12-16 19:30:00', 70, 1, true, 1, '2025-12-12 04:43:18', '2025-12-15 23:24:17'),
(5, NULL, 4, 'ar_exam', 'Ex1', 'aaaa', 10, NULL, '2025-12-22 06:38:00', 70, NULL, true, 1, '2025-12-15 06:39:14', '2025-12-15 06:43:28');
INSERT INTO "exam_attempts" ("id", "exam_id", "user_id", "started_at", "completed_at", "time_spent", "score", "passed", "result_id") VALUES
(9, 3, 1, '2025-12-15 23:26:04', '2025-12-15 23:26:11', 5, '100.00', true, 3);
INSERT INTO "exam_details" ("id", "exam_id", "config_type", "config_value", "created_at", "updated_at") VALUES
(1, 3, 'categories', '["Animal","Cuerpo"]', '2025-12-12 04:43:18', '2025-12-15 23:24:17'),
(29, 5, 'ar_cards', '["AR00001765755122825","AR00001765755348141"]', '2025-12-15 07:15:42', '2025-12-15 07:16:12');
INSERT INTO "exam_results" ("id", "exam_id", "user_id", "lesson_id", "score", "total_words", "correct_matches", "time_spent", "difficulty", "passed", "created_at") VALUES
(3, 3, 1, NULL, 20, 2, 2, '5.00', 'normal', true, '2025-12-15 23:26:11');
INSERT INTO "exercises" ("id", "lesson_id", "type", "question", "answer", "dificultad", "activo") VALUES
(1, 1, 'text', '¿Cuál es la vocal que falta? A, _, U', 'I', 'medio', true),
(2, 1, 'multiple_choice', 'Selecciona la eyectiva de la serie bilabial.', 'p’', 'medio', true),
(3, 1, 'matching', 'Empareja cada grafía con su tipo: simple / aspirada / eyectiva.', '', 'medio', true),
(4, 2, 'fill_in_the_blank', 'Completa la frase: "La casa en Aymara es ____."', 'uta', 'medio', true),
(5, 1, 'text', 'Escribe la vocal que completa la palabra: _ma (agua)', 'U', 'medio', true),
(6, 1, 'multiple_choice', '¿Cuál NO pertenece al alfabeto aymara?', 'E', 'medio', true),
(7, 1, 'matching', 'Empareja las palabras en Aymara con sus traducciones en español.', '', 'medio', true),
(8, 2, 'fill_in_the_blank', 'Completa la frase: "La luna en Aymara es ____."', 'janaq', 'medio', true),
(9, 1, 'text', 'Letra que representa punto de articulación postvelar/uvular (k o q):', 'q', 'medio', true),
(10, 1, 'multiple_choice', '¿Qué par está correctamente emparejado?', 'q — postvelar (uvular)', 'medio', true),
(11, 1, 'matching', 'Empareja las palabras en Aymara con sus traducciones en español.', '', 'medio', true),
(12, 1, 'fill_in_the_blank', 'Completa: El aymara es un sistema ________ (fonémico/fonético) donde cada fonema tiene una letra.', 'fonémico', 'medio', true),
(13, 2, 'text', '¿Cómo se dice "agua" en aymara?', 'Yaku', 'medio', true),
(14, 2, 'multiple_choice', 'Selecciona la traducción correcta de "tiempo" en Aymara.', 'Sumaq', 'medio', true),
(15, 2, 'matching', 'Empareja las palabras en Aymara con sus traducciones en español.', NULL, 'medio', true),
(16, 2, 'fill_in_the_blank', 'Completa la frase: "El sol en Aymara es ____."', 'inti', 'medio', true),
(17, 3, 'fill_in_the_blank', 'Completa la frase: "Tres en Aymara es ____."', 'kimsa', 'medio', true),
(18, 3, 'multiple_choice', '¿Cuál es la traducción correcta de "dos" en Aymara?', 'kimsa', 'medio', true),
(19, 3, 'matching', 'Empareja los números en Aymara con sus traducciones en español.', NULL, 'medio', true),
(20, 4, 'fill_in_the_blank', 'Completa la frase: "El color rojo en Aymara es ____."', 'patu', 'medio', true),
(21, 4, 'fill_in_the_blank', 'Completa la frase: "El color rojo en Aymara es ____."', 'patu', 'medio', true),
(22, 4, 'multiple_choice', '¿Cuál es la traducción correcta de "azul" en Aymara?', 'q’ipi', 'medio', true),
(23, 4, 'matching', 'Empareja los colores en Aymara con sus traducciones en español.', NULL, 'medio', true);
INSERT INTO "exercise_attempts" ("id", "user_id", "exercise_id", "lesson_id", "attempt_number", "user_answer", "correct_answer", "is_correct", "score", "time_spent", "error_type", "error_details", "exercise_type", "difficulty_level", "created_at") VALUES
(1, 1, 10, 1, 1, NULL, 'q — postvelar (uvular)', false, 10, 0, NULL, NULL, 'multiple_choice', 'medio', '2025-12-15 05:49:16'),
(2, 1, 1, 1, 1, NULL, 'I', false, 10, 0, NULL, NULL, 'text', 'medio', '2025-12-15 23:15:56');
INSERT INTO "exercise_types" ("id", "type_code", "type_name", "description", "requires_options", "requires_pairs", "requires_answers", "created_at") VALUES
(1, 'text', 'Texto', 'Ejercicio de respuesta de texto libre', false, false, false, '2025-12-11 06:03:53'),
(2, 'multiple_choice', 'Opción Múltiple', 'Ejercicio con múltiples opciones de respuesta', true, false, false, '2025-12-11 06:03:53'),
(3, 'matching', 'Emparejamiento', 'Ejercicio de emparejar elementos', false, true, false, '2025-12-11 06:03:53'),
(4, 'fill_in_the_blank', 'Completar Espacios', 'Ejercicio de completar espacios en blanco', false, false, true, '2025-12-11 06:03:53');
INSERT INTO "fill_in_the_blank_answers" ("id", "exercise_id", "answer_text") VALUES
(1, 4, 'uta'),
(2, 8, 'janaq'),
(3, 8, 'kimsa'),
(4, 11, 'patu'),
(5, 11, 'patu'),
(7, 12, 'fonémico');
INSERT INTO "lessons" ("id", "exam_id", "title", "description", "curso", "orden", "activo", "grants_ar_marker", "ar_card_id", "maestro_id", "default_topic_id") VALUES
(1, NULL, 'Lección 1: Introducción al Aymara', 'Esta lección cubre los conceptos básicos del idioma Aymara.', 1, 1, true, true, 2, 1, 1),
(2, NULL, 'Lección 2: Vocabulario Común', 'En esta lección aprenderás vocabulario común en Aymara.', 1, 2, true, false, NULL, 1, 2),
(3, NULL, 'Lección 3: Números y Cantidades', 'En esta lección aprenderás los números y cómo contar en Aymara.', 2, 3, true, false, NULL, 2, 3),
(4, NULL, 'Lección 4: Colores en Aymara', 'En esta lección aprenderás los colores en Aymara.', 2, 4, true, false, NULL, 2, 4);
INSERT INTO "lesson_topics" ("id", "lesson_id", "title", "content", "file_path", "order", "activo", "created_at", "updated_at") VALUES
(1, 1, 'Leccion 1', NULL, 'tema_alfabeto.php', 1, true, '2025-12-14 05:12:14', '2025-12-15 14:23:08'),
(2, 2, 'Lección 2: El sistema de 4 personas gramaticales en Aymara', NULL, 'tema_personas_gramaticales.php', 1, true, '2025-12-14 05:12:14', '2025-12-14 05:12:14'),
(3, 3, 'Lección 3: Sufijos básicos y Reglas de Uso', NULL, 'tema_sufijos_basicos.php', 1, true, '2025-12-14 05:12:14', '2025-12-14 05:12:14'),
(4, 4, 'Lección 4: Léxico temático', NULL, 'tema_temas_notables.php', 1, true, '2025-12-14 05:12:14', '2025-12-14 05:12:14');
INSERT INTO "matching_pairs" ("id", "exercise_id", "aymara_word", "spanish_word") VALUES
(31, 15, 'Jach’a', 'Grande'),
(32, 15, 'chiri', 'frío'),
(33, 15, 'jiri', 'rápido'),
(34, 15, 't’ika', 'flor'),
(35, 15, 'ñan', 'camino'),
(36, 15, 'chacha', 'hombre'),
(37, 15, 'warmi', 'mujer'),
(38, 15, 'sumañi', 'hermoso'),
(39, 15, 'kawsay', 'vida'),
(40, 10, 'wancha', 'uno'),
(41, 10, 'kimsa', 'tres'),
(42, 10, 'tawa', 'cuatro'),
(43, 10, 'pichqa', 'cinco'),
(47, 10, 'ichu', 'nueve'),
(48, 13, 'patu', 'rojo'),
(49, 13, 'q’ipi', 'azul'),
(50, 13, 'suma', 'verde'),
(51, 13, 'sallqa', 'amarillo'),
(52, 13, 'misi', 'blanco'),
(53, 13, 'ch’iri', 'negro'),
(62, 3, 'p', 'simple'),
(63, 3, 'ph', 'aspirada'),
(64, 3, 'p’', 'eyectiva'),
(65, 3, 'ch’', 'eyectiva'),
(66, 3, 't', 'simple'),
(67, 3, 'th', 'aspirada'),
(68, 3, 't’', 'eyectiva'),
(69, 3, 'ch', 'simple'),
(70, 7, 'Bilabial', 'p / ph / p’'),
(71, 7, 'Dental', 't / th / t’'),
(72, 7, 'Palatal', 'ch / chh / ch’'),
(73, 7, 'Velar', 'k / kh / k’'),
(74, 7, 'Postvelar (uvular)', 'q / qh / q’'),
(75, 7, 'Alargamiento vocálico', 'ï / ä / ü'),
(76, 11, 'Alaña', 'Comprar'),
(77, 11, 'Ikintaña', 'Dormir/estar durmiendo'),
(78, 11, 'Uma', 'Agua'),
(79, 11, 'Phaxsi', 'Luna');
INSERT INTO "multiple_choice_options" ("id", "exercise_id", "option_text", "option_image", "is_correct") VALUES
(4, 6, 'U', 'img/u.png', false),
(5, 6, 'E', 'img/e.png', true),
(6, 6, 'A', 'img/a.png', false),
(7, 10, 'ch — dental', 'img/ch.png', false),
(8, 10, 't — palatal', 'img/t.png', false),
(9, 10, 'q — postvelar (uvular)', 'img/q.png', true),
(10, 10, 'k — postvelar', 'img/k.png', false),
(11, 14, 'Jichha', NULL, true),
(12, 14, 'Inti', NULL, false),
(13, 9, 'kimsa', NULL, true),
(14, 9, 'suma', NULL, false),
(15, 9, 'jichha', NULL, false),
(16, 12, 'q’ipi', NULL, true),
(17, 12, 'patu', NULL, false),
(18, 12, 'suma', NULL, false),
(22, 2, 'p’', 'img/p''.png', true),
(23, 2, 'ph', 'img/ph.png', false),
(24, 2, 'p', 'img/p.png', false);
INSERT INTO "search_history" ("id", "headword", "gloss", "search_date") VALUES
(1, 'Achachila', 'Antepasado', '2025-09-09 21:57:09'),
(2, 'Ajil mallku', 'Nombre ritual del dinero', '2025-09-09 22:05:51'),
(3, 'Ajil mallku', 'Nombre ritual del dinero', '2025-09-09 22:05:52'),
(4, 'Achachila', 'Antepasado', '2025-09-09 22:06:04'),
(5, 'Achachila', 'Antepasado', '2025-09-09 22:06:07'),
(6, 'Achachila', 'Antepasado', '2025-09-09 22:06:17'),
(7, 'Achachila', 'Antepasado', '2025-09-09 22:06:18'),
(8, 'Ch’uñuchaña', 'Hacer chuños', '2025-09-09 22:10:29'),
(9, 'Joven', 'joven', '2025-09-09 22:22:27'),
(10, 'Achachila', 'Antepasado', '2025-09-09 22:24:30'),
(11, 'Achachila', 'Antepasado', '2025-09-09 22:24:31'),
(12, 'Achachilanajanti', 'Con el espíritu', '2025-09-09 22:24:36'),
(13, 'Achachilanajanti', 'Con el espíritu', '2025-09-09 22:24:40'),
(14, 'Joven', 'Joven', '2025-09-11 07:28:38'),
(15, 'Ajil', 'Ajil', '2025-09-11 07:28:50'),
(16, 'Achachila', 'Achachila', '2025-09-11 07:29:03'),
(17, 'Achachila', 'Achachila', '2025-09-11 07:29:12');
INSERT INTO "statistics_aggregated" ("id", "user_id", "exercise_id", "lesson_id", "curso_id", "stat_type", "total_attempts", "successful_attempts", "failed_attempts", "average_score", "average_time", "most_common_error", "error_pattern", "difficulty_score", "neural_network_score", "predicted_difficulty", "last_calculated", "created_at", "updated_at") VALUES
(1, 1, 10, 1, NULL, 'exercise', 1, 0, 1, '10.00', '0.00', NULL, '[]', '96.00', '30.36', 'dificil', '2025-12-15 05:49:16', '2025-12-15 05:49:16', '2025-12-15 05:49:16'),
(2, NULL, NULL, NULL, 1, 'course', 1, 0, 1, '10.00', '0.00', NULL, '{"_neural_analysis":{"predicted_performance":66.09,"anomaly_score":0.1,"risk_level":"low","trend":"declining","recommendations":[{"type":"trend","priority":"medium","message":"La tendencia predicha muestra posible declive en el rendimiento.","action":"Implementar estrategias de intervenci\u00f3n temprana."}]}}', '96.00', '73.39', 'facil', '2025-12-15 05:50:39', '2025-12-15 05:50:39', '2025-12-15 16:03:13'),
(3, NULL, NULL, 1, NULL, 'lesson', 1, 0, 1, '10.00', '0.00', NULL, '{"_neural_analysis":{"predicted_performance":66.09,"anomaly_score":0.1,"risk_level":"low","trend":"declining","recommendations":[{"type":"trend","priority":"medium","message":"La tendencia predicha muestra posible declive en el rendimiento.","action":"Implementar estrategias de intervenci\u00f3n temprana."}]}}', '96.00', '73.39', 'facil', '2025-12-15 05:50:39', '2025-12-15 05:50:39', '2025-12-15 16:01:54'),
(4, 1, 1, 1, NULL, 'exercise', 1, 0, 1, '10.00', '0.00', NULL, '{"_neural_analysis":{"predicted_performance":66.09,"anomaly_score":0.1,"risk_level":"low","trend":"declining","recommendations":[{"type":"trend","priority":"medium","message":"La tendencia predicha muestra posible declive en el rendimiento.","action":"Implementar estrategias de intervenci\u00f3n temprana."}]}}', '96.00', '73.39', 'facil', '2025-12-15 23:15:56', '2025-12-15 23:15:56', '2025-12-15 23:15:56'),
(5, NULL, 1, NULL, NULL, 'exercise', 1, 0, 1, '10.00', '0.00', NULL, '{"_neural_analysis":{"predicted_performance":66.09,"anomaly_score":0.1,"risk_level":"low","trend":"declining","recommendations":[{"type":"trend","priority":"medium","message":"La tendencia predicha muestra posible declive en el rendimiento.","action":"Implementar estrategias de intervenci\u00f3n temprana."}]}}', '96.00', '73.39', 'facil', '2025-12-15 23:21:15', '2025-12-15 23:21:15', '2025-12-15 23:21:15');
INSERT INTO "user_ar_cards" ("id", "user_id", "ar_card_id", "unlocked_at", "unlocked_by", "source_id") VALUES
(1, 1, 18, '2025-12-14 04:18:48', 'lesson', 1),
(2, 1, 2, '2025-12-15 05:48:53', 'lesson', 1),
(3, 1, 1, '2025-12-15 05:54:38', 'exam', 3);
INSERT INTO "user_attempts" ("id", "user_id", "lesson_id", "attempt_no", "score", "errors", "streak", "created_at") VALUES
(1, 18, 1, 1, 62, 4, 6, '2025-08-28 15:26:12'),
(2, 18, 1, 2, 100, 0, 25, '2025-08-28 15:27:58'),
(3, 10, 1, 1, 78, 3, 23, '2025-08-28 16:06:27'),
(4, 10, 1, 2, 78, 3, 23, '2025-08-28 16:06:38'),
(5, 19, 1, 1, 60, 4, 3, '2025-08-28 16:16:08'),
(6, 19, 1, 2, 52, 5, 9, '2025-08-28 16:17:40'),
(7, 20, 1, 1, 82, 2, 6, '2025-08-28 16:42:40'),
(8, 20, 1, 2, 70, 3, 1, '2025-08-28 16:43:21'),
(9, 21, 1, 1, 98, 1, 24, '2025-08-28 17:10:11'),
(10, 21, 1, 2, 98, 1, 24, '2025-08-28 17:10:23'),
(11, 23, 1, 1, 82, 2, 7, '2025-08-28 17:52:00'),
(12, 23, 1, 2, 82, 2, 7, '2025-08-28 17:52:17'),
(13, 24, 1, 1, 98, 1, 24, '2025-08-28 18:01:31'),
(14, 24, 1, 2, 96, 1, 17, '2025-08-28 18:02:54'),
(15, 25, 1, 1, 68, 4, 24, '2025-08-28 18:05:27'),
(16, 25, 1, 2, 84, 2, 12, '2025-08-28 18:06:55'),
(17, 26, 1, 1, 92, 1, 6, '2025-08-28 18:09:04'),
(18, 26, 1, 2, 72, 3, 6, '2025-08-28 18:10:08'),
(19, 1, 1, 2, 51, 68, 0, '2025-09-26 05:34:38'),
(20, 1, 1, 2, 51, 44, 0, '2025-09-26 05:49:52'),
(21, 1, 1, 2, 100, 66, 3, '2025-09-26 06:14:55'),
(22, 1, 1, 2, 186, 64, 4, '2025-12-03 21:13:16');
INSERT INTO "user_attempt_details" ("id", "attempt_id", "exercise_id", "question_text", "user_answer", "correct_answer", "is_correct", "time_spent", "difficulty_level", "error_type", "created_at", "exercise_type", "user_answer_time") VALUES
(1, 21, 1, 'Â¿CuÃ¡l es la vocal que falta? A, _, U', 'nnn', 'I', false, 0, 'medio', 'concepto_equivocado', '2025-09-26 06:14:55', 'text', '2025-09-26 06:14:55'),
(2, 21, 1, 'Â¿CuÃ¡l es la vocal que falta? A, _, U', 'nnn', 'I', false, 0, 'medio', 'concepto_equivocado', '2025-09-26 06:14:55', 'text', '2025-09-26 06:14:55'),
(3, 21, 1, 'Â¿CuÃ¡l es la vocal que falta? A, _, U', 'nnn', 'I', false, 0, 'medio', 'concepto_equivocado', '2025-09-26 06:14:55', 'text', '2025-09-26 06:14:55'),
(4, 21, 1, 'Â¿CuÃ¡l es la vocal que falta? A, _, U', 'i', 'I', true, 0, 'medio', '', '2025-09-26 06:14:55', 'text', '2025-09-26 06:14:55'),
(5, 21, 2, 'Selecciona la eyectiva de la serie bilabial.', 'pâ€™', 'pâ€™', true, 0, 'medio', '', '2025-09-26 06:14:55', 'multiple_choice', '2025-09-26 06:14:55'),
(6, 21, 3, 'Empareja cada grafÃ­a con su tipo: simple / aspirada / eyectiva.', 'ph -> simple', 'Emparejamiento incorrecto', false, 16, 'medio', 'emparejamiento_incorrecto', '2025-09-26 06:14:55', 'matching', '2025-09-26 06:14:55'),
(7, 21, 3, 'Empareja cada grafÃ­a con su tipo: simple / aspirada / eyectiva.', 'tâ€™ -> eyectiva', 'Emparejamiento incorrecto', false, 22, 'medio', 'emparejamiento_incorrecto', '2025-09-26 06:14:55', 'matching', '2025-09-26 06:14:55'),
(8, 21, 3, 'Empareja cada grafÃ­a con su tipo: simple / aspirada / eyectiva.', 'eyectiva -> ch', 'Emparejamiento incorrecto', false, 30, 'medio', 'emparejamiento_incorrecto', '2025-09-26 06:14:55', 'matching', '2025-09-26 06:14:55'),
(9, 21, 3, 'Empareja cada grafÃ­a con su tipo: simple / aspirada / eyectiva.', 'th -> eyectiva', 'Emparejamiento incorrecto', false, 39, 'medio', 'emparejamiento_incorrecto', '2025-09-26 06:14:55', 'matching', '2025-09-26 06:14:55'),
(10, 21, 3, 'Empareja cada grafÃ­a con su tipo: simple / aspirada / eyectiva.', 'eyectiva -> th', 'Emparejamiento incorrecto', false, 42, 'medio', 'emparejamiento_incorrecto', '2025-09-26 06:14:55', 'matching', '2025-09-26 06:14:55'),
(11, 21, 3, 'Empareja cada grafÃ­a con su tipo: simple / aspirada / eyectiva.', 'châ€™ -> eyectiva', 'Emparejamiento incorrecto', false, 49, 'medio', 'emparejamiento_incorrecto', '2025-09-26 06:14:55', 'matching', '2025-09-26 06:14:55'),
(12, 21, 3, 'Empareja cada grafÃ­a con su tipo: simple / aspirada / eyectiva.', 'eyectiva -> châ€™', 'Emparejamiento incorrecto', false, 52, 'medio', 'emparejamiento_incorrecto', '2025-09-26 06:14:55', 'matching', '2025-09-26 06:14:55'),
(13, 21, 3, 'Empareja cada grafÃ­a con su tipo: simple / aspirada / eyectiva.', 'aspirada -> ch', 'Emparejamiento incorrecto', false, 60, 'medio', 'emparejamiento_incorrecto', '2025-09-26 06:14:55', 'matching', '2025-09-26 06:14:55'),
(14, 21, 3, 'Empareja cada grafÃ­a con su tipo: simple / aspirada / eyectiva.', 'aspirada -> th', 'Emparejamiento incorrecto', false, 68, 'medio', 'emparejamiento_incorrecto', '2025-09-26 06:14:55', 'matching', '2025-09-26 06:14:55'),
(15, 21, 3, 'Empareja cada grafÃ­a con su tipo: simple / aspirada / eyectiva.', 'ch -> th', 'Emparejamiento incorrecto', false, 74, 'medio', 'emparejamiento_incorrecto', '2025-09-26 06:14:55', 'matching', '2025-09-26 06:14:55'),
(16, 21, 3, 'Empareja cada grafÃ­a con su tipo: simple / aspirada / eyectiva.', 'simple -> t', 'Emparejamiento correcto', true, 91, 'medio', '', '2025-09-26 06:14:55', 'matching', '2025-09-26 06:14:55'),
(17, 21, 3, 'Empareja cada grafÃ­a con su tipo: simple / aspirada / eyectiva.', 'simple -> p', 'Emparejamiento incorrecto', false, 98, 'medio', 'emparejamiento_incorrecto', '2025-09-26 06:14:55', 'matching', '2025-09-26 06:14:55'),
(18, 21, 3, 'Empareja cada grafÃ­a con su tipo: simple / aspirada / eyectiva.', 'p -> simple', 'Emparejamiento correcto', true, 105, 'medio', '', '2025-09-26 06:14:55', 'matching', '2025-09-26 06:14:55'),
(19, 21, 3, 'Empareja cada grafÃ­a con su tipo: simple / aspirada / eyectiva.', 'ch -> simple', 'Emparejamiento correcto', true, 114, 'medio', '', '2025-09-26 06:14:55', 'matching', '2025-09-26 06:14:55'),
(20, 21, 3, 'Empareja cada grafÃ­a con su tipo: simple / aspirada / eyectiva.', 'eyectiva -> châ€™', 'Emparejamiento correcto', true, 127, 'medio', '', '2025-09-26 06:14:55', 'matching', '2025-09-26 06:14:55'),
(21, 21, 3, 'Empareja cada grafÃ­a con su tipo: simple / aspirada / eyectiva.', 'aspirada -> ph', 'Emparejamiento correcto', true, 140, 'medio', '', '2025-09-26 06:14:55', 'matching', '2025-09-26 06:14:55'),
(22, 21, 3, 'Empareja cada grafÃ­a con su tipo: simple / aspirada / eyectiva.', 'eyectiva -> pâ€™', 'Emparejamiento incorrecto', false, 157, 'medio', 'emparejamiento_incorrecto', '2025-09-26 06:14:55', 'matching', '2025-09-26 06:14:55'),
(23, 21, 3, 'Empareja cada grafÃ­a con su tipo: simple / aspirada / eyectiva.', 'eyectiva -> pâ€™', 'Emparejamiento correcto', true, 162, 'medio', '', '2025-09-26 06:14:55', 'matching', '2025-09-26 06:14:55'),
(24, 21, 3, 'Empareja cada grafÃ­a con su tipo: simple / aspirada / eyectiva.', 'aspirada -> th', 'Emparejamiento correcto', true, 165, 'medio', '', '2025-09-26 06:14:55', 'matching', '2025-09-26 06:14:55'),
(25, 21, 3, 'Empareja cada grafÃ­a con su tipo: simple / aspirada / eyectiva.', 'tâ€™ -> eyectiva', 'Emparejamiento correcto', true, 167, 'medio', '', '2025-09-26 06:14:55', 'matching', '2025-09-26 06:14:55'),
(26, 21, 5, 'Escribe la vocal que completa la palabra: _ma (agua)', 'u', 'U', true, 0, 'medio', '', '2025-09-26 06:14:55', 'text', '2025-09-26 06:14:55'),
(27, 21, 6, 'Â¿CuÃ¡l NO pertenece al alfabeto aymara?', 'E', 'E', true, 0, 'medio', '', '2025-09-26 06:14:55', 'multiple_choice', '2025-09-26 06:14:55'),
(28, 21, 7, 'Empareja las palabras en Aymara con sus traducciones en espaÃ±ol.', 'k / kh / kâ€™ -> ch / chh / châ€™', 'Emparejamiento incorrecto', false, 8, 'medio', 'emparejamiento_incorrecto', '2025-09-26 06:14:55', 'matching', '2025-09-26 06:14:55'),
(29, 21, 7, 'Empareja las palabras en Aymara con sus traducciones en espaÃ±ol.', 'Palatal -> Bilabial', 'Emparejamiento incorrecto', false, 12, 'medio', 'emparejamiento_incorrecto', '2025-09-26 06:14:55', 'matching', '2025-09-26 06:14:55'),
(30, 21, 7, 'Empareja las palabras en Aymara con sus traducciones en espaÃ±ol.', 'Dental -> t / th / tâ€™', 'Emparejamiento correcto', true, 21, 'medio', '', '2025-09-26 06:14:55', 'matching', '2025-09-26 06:14:55'),
(31, 21, 7, 'Empareja las palabras en Aymara con sus traducciones en espaÃ±ol.', 'Postvelar (uvular) -> k / kh / kâ€™', 'Emparejamiento incorrecto', false, 24, 'medio', 'emparejamiento_incorrecto', '2025-09-26 06:14:55', 'matching', '2025-09-26 06:14:55'),
(32, 21, 7, 'Empareja las palabras en Aymara con sus traducciones en espaÃ±ol.', 'Ã¯ / Ã¤ / Ã¼ -> Bilabial', 'Emparejamiento incorrecto', false, 26, 'medio', 'emparejamiento_incorrecto', '2025-09-26 06:14:55', 'matching', '2025-09-26 06:14:55'),
(33, 21, 7, 'Empareja las palabras en Aymara con sus traducciones en espaÃ±ol.', 'Palatal -> q / qh / qâ€™', 'Emparejamiento incorrecto', false, 28, 'medio', 'emparejamiento_incorrecto', '2025-09-26 06:14:55', 'matching', '2025-09-26 06:14:55'),
(34, 21, 7, 'Empareja las palabras en Aymara con sus traducciones en espaÃ±ol.', 'p / ph / pâ€™ -> Bilabial', 'Emparejamiento correcto', true, 31, 'medio', '', '2025-09-26 06:14:55', 'matching', '2025-09-26 06:14:55'),
(35, 21, 7, 'Empareja las palabras en Aymara con sus traducciones en espaÃ±ol.', 'Alargamiento vocÃ¡lico -> ch / chh / châ€™', 'Emparejamiento incorrecto', false, 33, 'medio', 'emparejamiento_incorrecto', '2025-09-26 06:14:55', 'matching', '2025-09-26 06:14:55'),
(36, 21, 7, 'Empareja las palabras en Aymara con sus traducciones en espaÃ±ol.', 'Velar -> Palatal', 'Emparejamiento incorrecto', false, 37, 'medio', 'emparejamiento_incorrecto', '2025-09-26 06:14:55', 'matching', '2025-09-26 06:14:55'),
(37, 21, 7, 'Empareja las palabras en Aymara con sus traducciones en espaÃ±ol.', 'q / qh / qâ€™ -> Ã¯ / Ã¤ / Ã¼', 'Emparejamiento incorrecto', false, 41, 'medio', 'emparejamiento_incorrecto', '2025-09-26 06:14:55', 'matching', '2025-09-26 06:14:55'),
(38, 21, 7, 'Empareja las palabras en Aymara con sus traducciones en espaÃ±ol.', 'Postvelar (uvular) -> k / kh / kâ€™', 'Emparejamiento incorrecto', false, 46, 'medio', 'emparejamiento_incorrecto', '2025-09-26 06:14:55', 'matching', '2025-09-26 06:14:55'),
(39, 21, 7, 'Empareja las palabras en Aymara con sus traducciones en espaÃ±ol.', 'k / kh / kâ€™ -> Postvelar (uvular)', 'Emparejamiento incorrecto', false, 48, 'medio', 'emparejamiento_incorrecto', '2025-09-26 06:14:55', 'matching', '2025-09-26 06:14:55'),
(40, 21, 7, 'Empareja las palabras en Aymara con sus traducciones en espaÃ±ol.', 'Ã¯ / Ã¤ / Ã¼ -> Postvelar (uvular)', 'Emparejamiento incorrecto', false, 51, 'medio', 'emparejamiento_incorrecto', '2025-09-26 06:14:55', 'matching', '2025-09-26 06:14:55'),
(41, 21, 7, 'Empareja las palabras en Aymara con sus traducciones en espaÃ±ol.', 'Velar -> Postvelar (uvular)', 'Emparejamiento incorrecto', false, 54, 'medio', 'emparejamiento_incorrecto', '2025-09-26 06:14:55', 'matching', '2025-09-26 06:14:55'),
(42, 21, 7, 'Empareja las palabras en Aymara con sus traducciones en espaÃ±ol.', 'Alargamiento vocÃ¡lico -> q / qh / qâ€™', 'Emparejamiento incorrecto', false, 60, 'medio', 'emparejamiento_incorrecto', '2025-09-26 06:14:55', 'matching', '2025-09-26 06:14:55'),
(43, 21, 7, 'Empareja las palabras en Aymara con sus traducciones en espaÃ±ol.', 'Palatal -> ch / chh / châ€™', 'Emparejamiento correcto', true, 65, 'medio', '', '2025-09-26 06:14:55', 'matching', '2025-09-26 06:14:55'),
(44, 21, 7, 'Empareja las palabras en Aymara con sus traducciones en espaÃ±ol.', 'q / qh / qâ€™ -> Postvelar (uvular)', 'Emparejamiento correcto', true, 68, 'medio', '', '2025-09-26 06:14:55', 'matching', '2025-09-26 06:14:55'),
(45, 21, 7, 'Empareja las palabras en Aymara con sus traducciones en espaÃ±ol.', 'k / kh / kâ€™ -> Alargamiento vocÃ¡lico', 'Emparejamiento incorrecto', false, 73, 'medio', 'emparejamiento_incorrecto', '2025-09-26 06:14:55', 'matching', '2025-09-26 06:14:55'),
(46, 21, 7, 'Empareja las palabras en Aymara con sus traducciones en espaÃ±ol.', 'Ã¯ / Ã¤ / Ã¼ -> Alargamiento vocÃ¡lico', 'Emparejamiento correcto', true, 76, 'medio', '', '2025-09-26 06:14:55', 'matching', '2025-09-26 06:14:55'),
(47, 21, 7, 'Empareja las palabras en Aymara con sus traducciones en espaÃ±ol.', 'k / kh / kâ€™ -> Velar', 'Emparejamiento correcto', true, 79, 'medio', '', '2025-09-26 06:14:55', 'matching', '2025-09-26 06:14:55'),
(48, 21, 9, 'Letra que representa punto de articulaciÃ³n postvelar/uvular (k o q):', 'q', 'q', true, 0, 'medio', '', '2025-09-26 06:14:55', 'text', '2025-09-26 06:14:55'),
(49, 21, 10, 'Â¿QuÃ© par estÃ¡ correctamente emparejado?', 'q â€” postvelar (uvular)', 'q â€” postvelar (uvular)', true, 0, 'medio', '', '2025-09-26 06:14:55', 'multiple_choice', '2025-09-26 06:14:55'),
(50, 21, 11, 'Empareja las palabras en Aymara con sus traducciones en espaÃ±ol.', 'Phaxsi -> Agua', 'Emparejamiento incorrecto', false, 4, 'medio', 'emparejamiento_incorrecto', '2025-09-26 06:14:55', 'matching', '2025-09-26 06:14:55'),
(51, 21, 11, 'Empareja las palabras en Aymara con sus traducciones en espaÃ±ol.', 'Luna -> Phaxsi', 'Emparejamiento correcto', true, 9, 'medio', '', '2025-09-26 06:14:55', 'matching', '2025-09-26 06:14:55'),
(52, 21, 11, 'Empareja las palabras en Aymara con sus traducciones en espaÃ±ol.', 'Uma -> Agua', 'Emparejamiento correcto', true, 15, 'medio', '', '2025-09-26 06:14:55', 'matching', '2025-09-26 06:14:55'),
(53, 21, 11, 'Empareja las palabras en Aymara con sus traducciones en espaÃ±ol.', 'Dormir/estar durmiendo -> AlaÃ±a', 'Emparejamiento incorrecto', false, 19, 'medio', 'emparejamiento_incorrecto', '2025-09-26 06:14:55', 'matching', '2025-09-26 06:14:55'),
(54, 21, 11, 'Empareja las palabras en Aymara con sus traducciones en espaÃ±ol.', 'Comprar -> Dormir/estar durmiendo', 'Emparejamiento incorrecto', false, 21, 'medio', 'emparejamiento_incorrecto', '2025-09-26 06:14:55', 'matching', '2025-09-26 06:14:55'),
(55, 21, 11, 'Empareja las palabras en Aymara con sus traducciones en espaÃ±ol.', 'Comprar -> AlaÃ±a', 'Emparejamiento correcto', true, 24, 'medio', '', '2025-09-26 06:14:55', 'matching', '2025-09-26 06:14:55'),
(56, 21, 11, 'Empareja las palabras en Aymara con sus traducciones en espaÃ±ol.', 'IkintaÃ±a -> Dormir/estar durmiendo', 'Emparejamiento correcto', true, 27, 'medio', '', '2025-09-26 06:14:55', 'matching', '2025-09-26 06:14:55'),
(57, 21, 12, 'Completa: El aymara es un sistema ________ (fonÃ©mico/fonÃ©tico) donde cada fonema tiene una letra.', 'fonÃ©mico', 'fonÃ©mico', true, 0, 'medio', '', '2025-09-26 06:14:55', 'fill_in_the_blank', '2025-09-26 06:14:55'),
(58, 22, 1, 'Â¿CuÃ¡l es la vocal que falta? A, _, U', 'i', 'I', true, 0, 'medio', '', '2025-12-03 21:13:16', 'text', '2025-12-03 21:13:16'),
(59, 22, 2, 'Selecciona la eyectiva de la serie bilabial.', 'pâ€™', 'pâ€™', true, 0, 'medio', '', '2025-12-03 21:13:16', 'multiple_choice', '2025-12-03 21:13:16'),
(60, 22, 3, 'Empareja cada grafÃ­a con su tipo: simple / aspirada / eyectiva.', 'p -> ch', 'Emparejamiento incorrecto', false, 5, 'medio', 'emparejamiento_incorrecto', '2025-12-03 21:13:16', 'matching', '2025-12-03 21:13:16'),
(61, 22, 3, 'Empareja cada grafÃ­a con su tipo: simple / aspirada / eyectiva.', 'aspirada -> eyectiva', 'Emparejamiento incorrecto', false, 225, 'medio', 'emparejamiento_incorrecto', '2025-12-03 21:13:16', 'matching', '2025-12-03 21:13:16'),
(62, 22, 3, 'Empareja cada grafÃ­a con su tipo: simple / aspirada / eyectiva.', 'ph -> eyectiva', 'Emparejamiento incorrecto', false, 230, 'medio', 'emparejamiento_incorrecto', '2025-12-03 21:13:16', 'matching', '2025-12-03 21:13:16'),
(63, 22, 3, 'Empareja cada grafÃ­a con su tipo: simple / aspirada / eyectiva.', 'simple -> simple', 'Emparejamiento incorrecto', false, 284, 'medio', 'emparejamiento_incorrecto', '2025-12-03 21:13:16', 'matching', '2025-12-03 21:13:16'),
(64, 22, 3, 'Empareja cada grafÃ­a con su tipo: simple / aspirada / eyectiva.', 'simple -> eyectiva', 'Emparejamiento incorrecto', false, 290, 'medio', 'emparejamiento_incorrecto', '2025-12-03 21:13:16', 'matching', '2025-12-03 21:13:16'),
(65, 22, 3, 'Empareja cada grafÃ­a con su tipo: simple / aspirada / eyectiva.', 'simple -> eyectiva', 'Emparejamiento incorrecto', false, 294, 'medio', 'emparejamiento_incorrecto', '2025-12-03 21:13:16', 'matching', '2025-12-03 21:13:16'),
(66, 22, 3, 'Empareja cada grafÃ­a con su tipo: simple / aspirada / eyectiva.', 'p -> eyectiva', 'Emparejamiento incorrecto', false, 301, 'medio', 'emparejamiento_incorrecto', '2025-12-03 21:13:16', 'matching', '2025-12-03 21:13:16'),
(67, 22, 3, 'Empareja cada grafÃ­a con su tipo: simple / aspirada / eyectiva.', 'eyectiva -> pâ€™', 'Emparejamiento incorrecto', false, 303, 'medio', 'emparejamiento_incorrecto', '2025-12-03 21:13:16', 'matching', '2025-12-03 21:13:16'),
(68, 22, 3, 'Empareja cada grafÃ­a con su tipo: simple / aspirada / eyectiva.', 'châ€™ -> eyectiva', 'Emparejamiento correcto', true, 313, 'medio', '', '2025-12-03 21:13:16', 'matching', '2025-12-03 21:13:16'),
(69, 22, 3, 'Empareja cada grafÃ­a con su tipo: simple / aspirada / eyectiva.', 'aspirada -> simple', 'Emparejamiento incorrecto', false, 320, 'medio', 'emparejamiento_incorrecto', '2025-12-03 21:13:16', 'matching', '2025-12-03 21:13:16'),
(70, 22, 3, 'Empareja cada grafÃ­a con su tipo: simple / aspirada / eyectiva.', 'ch -> aspirada', 'Emparejamiento incorrecto', false, 326, 'medio', 'emparejamiento_incorrecto', '2025-12-03 21:13:16', 'matching', '2025-12-03 21:13:16'),
(71, 22, 3, 'Empareja cada grafÃ­a con su tipo: simple / aspirada / eyectiva.', 'eyectiva -> tâ€™', 'Emparejamiento incorrecto', false, 335, 'medio', 'emparejamiento_incorrecto', '2025-12-03 21:13:16', 'matching', '2025-12-03 21:13:16'),
(72, 22, 3, 'Empareja cada grafÃ­a con su tipo: simple / aspirada / eyectiva.', 'ph -> simple', 'Emparejamiento incorrecto', false, 345, 'medio', 'emparejamiento_incorrecto', '2025-12-03 21:13:16', 'matching', '2025-12-03 21:13:16'),
(73, 22, 3, 'Empareja cada grafÃ­a con su tipo: simple / aspirada / eyectiva.', 'p -> simple', 'Emparejamiento incorrecto', false, 348, 'medio', 'emparejamiento_incorrecto', '2025-12-03 21:13:16', 'matching', '2025-12-03 21:13:16'),
(74, 22, 3, 'Empareja cada grafÃ­a con su tipo: simple / aspirada / eyectiva.', 'p -> simple', 'Emparejamiento correcto', true, 351, 'medio', '', '2025-12-03 21:13:16', 'matching', '2025-12-03 21:13:16'),
(75, 22, 3, 'Empareja cada grafÃ­a con su tipo: simple / aspirada / eyectiva.', 'ph -> simple', 'Emparejamiento incorrecto', false, 354, 'medio', 'emparejamiento_incorrecto', '2025-12-03 21:13:16', 'matching', '2025-12-03 21:13:16'),
(76, 22, 3, 'Empareja cada grafÃ­a con su tipo: simple / aspirada / eyectiva.', 'ph -> aspirada', 'Emparejamiento correcto', true, 368, 'medio', '', '2025-12-03 21:13:16', 'matching', '2025-12-03 21:13:16'),
(77, 22, 3, 'Empareja cada grafÃ­a con su tipo: simple / aspirada / eyectiva.', 'tâ€™ -> eyectiva', 'Emparejamiento incorrecto', false, 376, 'medio', 'emparejamiento_incorrecto', '2025-12-03 21:13:16', 'matching', '2025-12-03 21:13:16'),
(78, 22, 3, 'Empareja cada grafÃ­a con su tipo: simple / aspirada / eyectiva.', 'eyectiva -> tâ€™', 'Emparejamiento correcto', true, 382, 'medio', '', '2025-12-03 21:13:16', 'matching', '2025-12-03 21:13:16'),
(79, 22, 3, 'Empareja cada grafÃ­a con su tipo: simple / aspirada / eyectiva.', 'aspirada -> eyectiva', 'Emparejamiento incorrecto', false, 389, 'medio', 'emparejamiento_incorrecto', '2025-12-03 21:13:16', 'matching', '2025-12-03 21:13:16'),
(80, 22, 3, 'Empareja cada grafÃ­a con su tipo: simple / aspirada / eyectiva.', 'aspirada -> th', 'Emparejamiento correcto', true, 397, 'medio', '', '2025-12-03 21:13:16', 'matching', '2025-12-03 21:13:16'),
(81, 22, 3, 'Empareja cada grafÃ­a con su tipo: simple / aspirada / eyectiva.', 't -> simple', 'Emparejamiento incorrecto', false, 403, 'medio', 'emparejamiento_incorrecto', '2025-12-03 21:13:16', 'matching', '2025-12-03 21:13:16'),
(82, 22, 3, 'Empareja cada grafÃ­a con su tipo: simple / aspirada / eyectiva.', 'simple -> t', 'Emparejamiento correcto', true, 422, 'medio', '', '2025-12-03 21:13:16', 'matching', '2025-12-03 21:13:16'),
(83, 22, 3, 'Empareja cada grafÃ­a con su tipo: simple / aspirada / eyectiva.', 'ch -> eyectiva', 'Emparejamiento incorrecto', false, 428, 'medio', 'emparejamiento_incorrecto', '2025-12-03 21:13:16', 'matching', '2025-12-03 21:13:16'),
(84, 22, 3, 'Empareja cada grafÃ­a con su tipo: simple / aspirada / eyectiva.', 'ch -> simple', 'Emparejamiento correcto', true, 431, 'medio', '', '2025-12-03 21:13:16', 'matching', '2025-12-03 21:13:16'),
(85, 22, 3, 'Empareja cada grafÃ­a con su tipo: simple / aspirada / eyectiva.', 'pâ€™ -> eyectiva', 'Emparejamiento correcto', true, 435, 'medio', '', '2025-12-03 21:13:16', 'matching', '2025-12-03 21:13:16'),
(86, 22, 5, 'Escribe la vocal que completa la palabra: _ma (agua)', 'u', 'U', true, 0, 'medio', '', '2025-12-03 21:13:16', 'text', '2025-12-03 21:13:16'),
(87, 22, 6, 'Â¿CuÃ¡l NO pertenece al alfabeto aymara?', 'U', 'E', false, 0, 'medio', 'seleccion_incorrecta', '2025-12-03 21:13:16', 'multiple_choice', '2025-12-03 21:13:16'),
(88, 22, 6, 'Â¿CuÃ¡l NO pertenece al alfabeto aymara?', 'A', 'E', false, 0, 'medio', 'seleccion_incorrecta', '2025-12-03 21:13:16', 'multiple_choice', '2025-12-03 21:13:16'),
(89, 22, 6, 'Â¿CuÃ¡l NO pertenece al alfabeto aymara?', 'E', 'E', true, 0, 'medio', '', '2025-12-03 21:13:16', 'multiple_choice', '2025-12-03 21:13:16'),
(90, 22, 7, 'Empareja las palabras en Aymara con sus traducciones en espaÃ±ol.', 'Velar -> k / kh / kâ€™', 'Emparejamiento correcto', true, 7, 'medio', '', '2025-12-03 21:13:16', 'matching', '2025-12-03 21:13:16'),
(91, 22, 7, 'Empareja las palabras en Aymara con sus traducciones en espaÃ±ol.', 'Palatal -> t / th / tâ€™', 'Emparejamiento incorrecto', false, 10, 'medio', 'emparejamiento_incorrecto', '2025-12-03 21:13:16', 'matching', '2025-12-03 21:13:16'),
(92, 22, 7, 'Empareja las palabras en Aymara con sus traducciones en espaÃ±ol.', 'Ã¯ / Ã¤ / Ã¼ -> Dental', 'Emparejamiento incorrecto', false, 14, 'medio', 'emparejamiento_incorrecto', '2025-12-03 21:13:16', 'matching', '2025-12-03 21:13:16'),
(93, 22, 7, 'Empareja las palabras en Aymara con sus traducciones en espaÃ±ol.', 'ch / chh / châ€™ -> Palatal', 'Emparejamiento correcto', true, 18, 'medio', '', '2025-12-03 21:13:16', 'matching', '2025-12-03 21:13:16'),
(94, 22, 7, 'Empareja las palabras en Aymara con sus traducciones en espaÃ±ol.', 'q / qh / qâ€™ -> p / ph / pâ€™', 'Emparejamiento incorrecto', false, 22, 'medio', 'emparejamiento_incorrecto', '2025-12-03 21:13:16', 'matching', '2025-12-03 21:13:16'),
(95, 22, 7, 'Empareja las palabras en Aymara con sus traducciones en espaÃ±ol.', 'Bilabial -> p / ph / pâ€™', 'Emparejamiento correcto', true, 26, 'medio', '', '2025-12-03 21:13:16', 'matching', '2025-12-03 21:13:16'),
(96, 22, 7, 'Empareja las palabras en Aymara con sus traducciones en espaÃ±ol.', 'Postvelar (uvular) -> Alargamiento vocÃ¡lico', 'Emparejamiento incorrecto', false, 29, 'medio', 'emparejamiento_incorrecto', '2025-12-03 21:13:16', 'matching', '2025-12-03 21:13:16'),
(97, 22, 7, 'Empareja las palabras en Aymara con sus traducciones en espaÃ±ol.', 'q / qh / qâ€™ -> Alargamiento vocÃ¡lico', 'Emparejamiento incorrecto', false, 32, 'medio', 'emparejamiento_incorrecto', '2025-12-03 21:13:16', 'matching', '2025-12-03 21:13:16'),
(98, 22, 7, 'Empareja las palabras en Aymara con sus traducciones en espaÃ±ol.', 'Postvelar (uvular) -> q / qh / qâ€™', 'Emparejamiento correcto', true, 35, 'medio', '', '2025-12-03 21:13:16', 'matching', '2025-12-03 21:13:16'),
(99, 22, 7, 'Empareja las palabras en Aymara con sus traducciones en espaÃ±ol.', 'Dental -> t / th / tâ€™', 'Emparejamiento correcto', true, 37, 'medio', '', '2025-12-03 21:13:16', 'matching', '2025-12-03 21:13:16'),
(100, 22, 7, 'Empareja las palabras en Aymara con sus traducciones en espaÃ±ol.', 'Ã¯ / Ã¤ / Ã¼ -> Alargamiento vocÃ¡lico', 'Emparejamiento correcto', true, 41, 'medio', '', '2025-12-03 21:13:16', 'matching', '2025-12-03 21:13:16'),
(101, 22, 9, 'Letra que representa punto de articulaciÃ³n postvelar/uvular (k o q):', 'q', 'q', true, 0, 'medio', '', '2025-12-03 21:13:16', 'text', '2025-12-03 21:13:16'),
(102, 22, 10, 'Â¿QuÃ© par estÃ¡ correctamente emparejado?', 'q â€” postvelar (uvular)', 'q â€” postvelar (uvular)', true, 0, 'medio', '', '2025-12-03 21:13:16', 'multiple_choice', '2025-12-03 21:13:16'),
(103, 22, 11, 'Empareja las palabras en Aymara con sus traducciones en espaÃ±ol.', 'AlaÃ±a -> IkintaÃ±a', 'Emparejamiento incorrecto', false, 3, 'medio', 'emparejamiento_incorrecto', '2025-12-03 21:13:16', 'matching', '2025-12-03 21:13:16'),
(104, 22, 11, 'Empareja las palabras en Aymara con sus traducciones en espaÃ±ol.', 'Luna -> Dormir/estar durmiendo', 'Emparejamiento incorrecto', false, 7, 'medio', 'emparejamiento_incorrecto', '2025-12-03 21:13:16', 'matching', '2025-12-03 21:13:16'),
(105, 22, 11, 'Empareja las palabras en Aymara con sus traducciones en espaÃ±ol.', 'Phaxsi -> Comprar', 'Emparejamiento incorrecto', false, 10, 'medio', 'emparejamiento_incorrecto', '2025-12-03 21:13:16', 'matching', '2025-12-03 21:13:16'),
(106, 22, 11, 'Empareja las palabras en Aymara con sus traducciones en espaÃ±ol.', 'Agua -> Uma', 'Emparejamiento correcto', true, 14, 'medio', '', '2025-12-03 21:13:16', 'matching', '2025-12-03 21:13:16'),
(107, 22, 11, 'Empareja las palabras en Aymara con sus traducciones en espaÃ±ol.', 'Dormir/estar durmiendo -> Phaxsi', 'Emparejamiento incorrecto', false, 17, 'medio', 'emparejamiento_incorrecto', '2025-12-03 21:13:16', 'matching', '2025-12-03 21:13:16'),
(108, 22, 11, 'Empareja las palabras en Aymara con sus traducciones en espaÃ±ol.', 'Luna -> IkintaÃ±a', 'Emparejamiento incorrecto', false, 20, 'medio', 'emparejamiento_incorrecto', '2025-12-03 21:13:16', 'matching', '2025-12-03 21:13:16'),
(109, 22, 11, 'Empareja las palabras en Aymara con sus traducciones en espaÃ±ol.', 'Phaxsi -> Luna', 'Emparejamiento correcto', true, 23, 'medio', '', '2025-12-03 21:13:16', 'matching', '2025-12-03 21:13:16'),
(110, 22, 11, 'Empareja las palabras en Aymara con sus traducciones en espaÃ±ol.', 'Comprar -> AlaÃ±a', 'Emparejamiento correcto', true, 27, 'medio', '', '2025-12-03 21:13:16', 'matching', '2025-12-03 21:13:16'),
(111, 22, 11, 'Empareja las palabras en Aymara con sus traducciones en espaÃ±ol.', 'IkintaÃ±a -> Dormir/estar durmiendo', 'Emparejamiento correcto', true, 30, 'medio', '', '2025-12-03 21:13:16', 'matching', '2025-12-03 21:13:16'),
(112, 22, 12, 'Completa: El aymara es un sistema ________ (fonÃ©mico/fonÃ©tico) donde cada fonema tiene una letra.', 'fonÃ©mico', 'fonÃ©mico', true, 0, 'medio', '', '2025-12-03 21:13:16', 'fill_in_the_blank', '2025-12-03 21:13:16');
INSERT INTO "user_progress" ("id", "user_id", "lesson_id", "exercise_id", "date", "errors", "score", "streak", "current_index", "total_exercises", "in_progress", "last_seen_at", "attempt_no", "completed", "attempts", "created_at", "updated_at", "last_exit_at") VALUES
(1, 1, 1, NULL, '2024-10-14', 34, 26, 0, 0, 0, false, '2025-08-28 19:50:55', 1, false, 1, '2025-12-11 05:42:00', '2025-12-11 05:42:23', NULL),
(2, 1, 1, NULL, '2024-10-15', 0, 22, 22, 0, 0, false, '2025-08-28 19:50:55', 1, false, 1, '2025-12-11 05:42:00', '2025-12-11 05:42:23', NULL),
(3, 1, 1, NULL, '2025-09-26', 66, 86, 3, 0, 0, false, '2025-09-26 22:59:31', 2, true, 1, '2025-12-11 05:42:00', '2025-12-11 05:42:23', NULL),
(4, 1, 1, NULL, '2025-10-24', 34, 26, 0, 0, 0, false, '2025-10-24 22:21:21', 1, false, 1, '2025-12-11 05:42:00', '2025-12-11 05:42:23', NULL),
(5, 1, 1, NULL, '2025-12-03', 64, 186, 4, 0, 0, false, '2025-12-04 01:13:16', 2, true, 1, '2025-12-11 05:42:00', '2025-12-11 05:42:23', NULL),
(6, 1, 2, NULL, '2024-10-14', 0, 1, 1, 0, 0, false, '2025-08-28 19:50:55', 1, false, 1, '2025-12-11 05:42:00', '2025-12-11 05:42:23', NULL),
(7, 1, 3, NULL, '2024-10-14', 2, 1, 0, 0, 0, false, '2025-08-28 19:50:55', 1, false, 1, '2025-12-11 05:42:00', '2025-12-11 05:42:23', NULL),
(8, 2, 1, NULL, '2024-10-17', 0, 9, 9, 0, 0, false, '2025-08-28 19:50:55', 1, false, 1, '2025-12-11 05:42:00', '2025-12-11 05:42:23', NULL),
(9, 3, 1, NULL, '2025-08-20', 1, 0, 0, 0, 0, false, '2025-08-28 19:50:55', 1, false, 1, '2025-12-11 05:42:00', '2025-12-11 05:42:23', NULL),
(10, 3, 1, NULL, '2025-08-21', 0, 2, 2, 0, 0, false, '2025-08-28 19:50:55', 1, false, 1, '2025-12-11 05:42:00', '2025-12-11 05:42:23', NULL),
(11, 3, 1, NULL, '2025-08-22', 1, 3, 0, 0, 0, false, '2025-08-28 19:50:55', 1, false, 1, '2025-12-11 05:42:00', '2025-12-11 05:42:23', NULL),
(12, 10, 1, NULL, '2025-08-28', 3, 78, 23, 10, 10, true, '2025-08-28 20:06:41', 2, true, 1, '2025-12-11 05:42:00', '2025-12-11 05:42:23', '2025-08-28 16:06:41'),
(13, 14, 1, NULL, '2025-08-28', 0, 100, 25, 0, 0, false, '2025-08-28 19:50:55', 2, true, 1, '2025-12-11 05:42:00', '2025-12-11 05:42:23', NULL),
(14, 15, 1, NULL, '2025-08-28', 0, 100, 25, 0, 0, false, '2025-08-28 19:50:55', 1, true, 1, '2025-12-11 05:42:00', '2025-12-11 05:42:23', NULL),
(15, 17, 1, NULL, '2025-08-28', 3, 72, 6, 0, 0, false, '2025-08-28 19:50:55', 1, false, 1, '2025-12-11 05:42:00', '2025-12-11 05:42:23', NULL),
(16, 18, 1, NULL, '2025-08-28', 0, 100, 25, 0, 0, false, '2025-08-28 19:50:55', 2, true, 1, '2025-12-11 05:42:00', '2025-12-11 05:42:23', NULL),
(17, 18, 2, NULL, '2025-08-29', 4, 0, 0, 0, 0, false, '2025-08-29 23:10:05', 0, false, 1, '2025-12-11 05:42:00', '2025-12-11 05:42:23', NULL),
(18, 19, 1, NULL, '2025-08-28', 5, 52, 9, 0, 0, false, '2025-08-28 20:17:40', 2, true, 1, '2025-12-11 05:42:00', '2025-12-11 05:42:23', '2025-08-28 16:15:03'),
(19, 20, 1, NULL, '2025-08-28', 3, 70, 1, 0, 0, false, '2025-08-28 20:43:21', 2, true, 1, '2025-12-11 05:42:00', '2025-12-11 05:42:23', '2025-08-28 16:39:05'),
(20, 21, 1, NULL, '2025-08-28', 1, 98, 24, 10, 0, false, '2025-08-28 21:10:23', 2, true, 1, '2025-12-11 05:42:00', '2025-12-11 05:42:23', '2025-08-28 17:09:00'),
(21, 22, 1, NULL, '2025-08-28', 2, 0, 0, 2, 0, false, '2025-08-28 21:49:52', 0, false, 1, '2025-12-11 05:42:00', '2025-12-11 05:42:23', NULL),
(22, 23, 1, NULL, '2025-08-28', 2, 82, 7, 10, 0, false, '2025-08-28 21:52:17', 2, true, 1, '2025-12-11 05:42:00', '2025-12-11 05:42:23', NULL),
(23, 24, 1, NULL, '2025-08-28', 1, 96, 17, 10, 0, false, '2025-08-28 22:02:54', 2, true, 1, '2025-12-11 05:42:00', '2025-12-11 05:42:23', NULL),
(24, 24, 2, NULL, '2025-08-28', 3, 0, 0, 0, 0, false, '2025-08-28 22:03:28', 0, false, 1, '2025-12-11 05:42:00', '2025-12-11 05:42:23', NULL),
(25, 25, 1, NULL, '2025-08-28', 2, 84, 12, 10, 0, false, '2025-08-28 22:06:55', 2, true, 1, '2025-12-11 05:42:00', '2025-12-11 05:42:23', NULL),
(26, 26, 1, NULL, '2025-08-28', 3, 72, 6, 10, 0, false, '2025-08-28 22:10:08', 2, true, 1, '2025-12-11 05:42:00', '2025-12-11 05:42:23', NULL),
(27, 28, 1, NULL, '2025-08-29', 4, 12, 0, 5, 0, false, '2025-08-29 23:41:07', 0, false, 1, '2025-12-11 05:42:00', '2025-12-11 05:42:23', NULL),
(28, 1, 1, 1, '2025-12-11', 0, 10, 0, 0, 0, false, '2025-12-16 03:15:56', 1, true, 10, '2025-12-11 06:10:19', '2025-12-15 23:15:56', NULL),
(31, 1, 1, 12, '2025-12-12', 0, 10, 0, 0, 0, false, '2025-12-12 09:36:08', 1, true, 7, '2025-12-12 04:44:15', '2025-12-12 05:36:08', NULL),
(46, 1, 1, 2, '2025-12-13', 0, 10, 0, 0, 0, false, '2025-12-13 22:04:11', 1, true, 2, '2025-12-12 05:38:15', '2025-12-13 18:04:11', NULL),
(47, 1, 1, 5, '2025-12-14', 0, 10, 0, 0, 0, false, '2025-12-12 09:38:36', 1, true, 1, '2025-12-12 05:38:36', '2025-12-12 05:38:36', NULL),
(48, 1, 1, 6, '2025-12-15', 0, 10, 0, 0, 0, false, '2025-12-12 09:39:15', 1, true, 3, '2025-12-12 05:38:54', '2025-12-12 05:39:15', NULL),
(49, 1, 1, 7, '2025-12-16', 0, 10, 0, 0, 0, false, '2025-12-12 09:41:43', 1, true, 1, '2025-12-12 05:41:43', '2025-12-12 05:41:43', NULL),
(50, 1, 1, 10, '2025-12-17', 0, 10, 0, 0, 0, false, '2025-12-15 09:49:16', 1, true, 3, '2025-12-12 05:45:53', '2025-12-15 05:49:16', NULL),
(55, 1, 1, 9, '2025-12-18', 0, 10, 0, 0, 0, false, '2025-12-13 22:05:00', 1, true, 1, '2025-12-13 18:05:00', '2025-12-13 18:05:00', NULL),
(56, 1, 1, 11, '2025-12-19', 0, 10, 0, 0, 0, false, '2025-12-13 23:13:25', 1, true, 1, '2025-12-13 19:13:25', '2025-12-13 19:13:25', NULL),
(57, 1, 2, 4, '2025-12-14', 0, 10, 0, 0, 0, false, '2025-12-14 08:36:52', 1, true, 1, '2025-12-14 04:36:52', '2025-12-14 04:36:52', NULL),
(58, 1, 2, 8, '2025-12-15', 0, 10, 0, 0, 0, false, '2025-12-14 08:37:16', 1, true, 2, '2025-12-14 04:37:06', '2025-12-14 04:37:16', NULL),
(59, 1, 2, 13, '2025-12-16', 0, 10, 0, 0, 0, false, '2025-12-14 08:38:02', 1, true, 1, '2025-12-14 04:38:02', '2025-12-14 04:38:02', NULL),
(60, 1, 2, 14, '2025-12-17', 0, 10, 0, 0, 0, false, '2025-12-14 08:38:30', 1, true, 1, '2025-12-14 04:38:30', '2025-12-14 04:38:30', NULL),
(61, 1, 2, 15, '2025-12-18', 0, 10, 0, 0, 0, false, '2025-12-14 08:40:26', 1, true, 1, '2025-12-14 04:40:26', '2025-12-14 04:40:26', NULL);
INSERT INTO "usuarios" ("id", "username", "password", "role", "activo", "email", "curso") VALUES
(1, 'Abraham', '$2y$10$uLe74rNsgoStVdJJkEBFZek2/OAVg5ncl7pbgJxeS5vPk8CI4g5DO', 'maestro', true, 'abraham@gmail.com', 1),
(2, 'Miguel', '$2y$10$uLe74rNsgoStVdJJkEBFZek2/OAVg5ncl7pbgJxeS5vPk8CI4g5DO', 'estudiante', true, 'Miguel@gmail.com', 1),
(3, 'Admin', '$2y$10$uLe74rNsgoStVdJJkEBFZek2/OAVg5ncl7pbgJxeS5vPk8CI4g5DO', 'admin', true, 'Admin@gmail.com', 1),
(4, 'juanito', '$2y$10$B0ADhAZ0qK0LcTxwjMsN2u/BtZlCF5CZVw.zwH3.nsyrR.E9WVEL6', 'estudiante', true, 'juanito@example.com', 1),
(5, 'maria25', '$2y$10$B0ADhAZ0qK0LcTxwjMsN2u/BtZlCF5CZVw.zwH3.nsyrR.E9WVEL6', 'estudiante', true, 'maria25@example.com', 1),
(6, 'pedrito', '$2y$10$B0ADhAZ0qK0LcTxwjMsN2u/BtZlCF5CZVw.zwH3.nsyrR.E9WVEL6', 'maestro', true, 'pedrito@example.com', 1),
(7, 'luisa_2000', '$2y$10$B0ADhAZ0qK0LcTxwjMsN2u/BtZlCF5CZVw.zwH3.nsyrR.E9WVEL6', 'estudiante', true, 'luisa_2000@example.com', 1),
(8, 'carlos89', 'Abraham123*', 'maestro', true, 'carlos89@example.com', 1),
(9, 'Daniel', '$2y$10$.qpdtZrUFTil3Vflh5Pv9.Y0OPdtV932fQKK64lHpdXrQ/cQnKxn2', 'estudiante', true, NULL, 1),
(10, 'Nadie', '$2y$10$uLe74rNsgoStVdJJkEBFZek2/OAVg5ncl7pbgJxeS5vPk8CI4g5DO', 'estudiante', true, NULL, 1),
(11, 'Nardo', '$2y$10$9ynkT7po2ACK4wWzQ7h7DeF4gekeS6cb/hAg9q4.JNq32lg9h6xom', 'estudiante', true, NULL, 2),
(12, 'Nardo', '$2y$10$CV6VMiuBQ44LX5qkR.cJpelSfHGgXU.Rl6FIdbFkzSlhXaT7AG4s6', 'estudiante', true, NULL, 2),
(14, 'Alfalfa', '$2y$10$nEAWjh0qH0fCj.ii/aIpYeTHBHOYGjP0FsnVQpV9NL3wVbUGWiq7q', 'estudiante', true, NULL, 1),
(15, 'Junior', '$2y$10$dvTf3Bcu6H5a7BIqB4i7Q.4zJDLCVpoJoIdMkn64LvvVUZB6bSljC', 'estudiante', true, NULL, 1),
(16, 'Junior', '$2y$10$8no0g5KkBvsQxUrQ2wR31ekqC2MJCTna7lpIv4tQcb92KdEivOLXO', 'estudiante', true, NULL, 1),
(17, 'Horacio', '$2y$10$0UHd.dgqMcOAzhfwcaHsje2bbdZdEDMMv4ipmJgquXvSOtndFu1PG', 'estudiante', true, NULL, 2),
(18, 'Cleopatra', '$2y$10$NrL2AKFyoUtxpg7cqQ26U./eleYDjw12FxnT5fXbSKJxbRFgEYZ/G', 'estudiante', true, NULL, 2),
(19, 'Rasputin', '$2y$10$FnpY8H0a.G99/mzPCFSfGurO9J4fc/hFJ9ln8HmmhNoqqyYoq0nzy', 'estudiante', true, NULL, 2),
(20, 'Gerundio', '$2y$10$tMNIGvu4MA6vekbDXO8MIu6LCtSivRP.1rNov1irGtIMMD0h5rJyC', 'estudiante', true, NULL, 2),
(21, 'Marco', '$2y$10$SnncoZDbLOfR4Tyr1qgS9uZ82sAhPQ.cIIbwzBnn6I2jK7FbPPscq', 'estudiante', true, NULL, 2),
(22, 'Elvira', '$2y$10$aGWMAjniaLmMIT8qOyuBLu6/SIJQceNCoDKYOFpvAI4IQTipu6yTC', 'estudiante', true, NULL, 2),
(23, 'Hermes', '$2y$10$Xe7hKFvfy3oT59M/vXWdLuHuDZ5lQLC5gRewF5hH5jTgoHVnKyGKu', 'estudiante', true, NULL, 1),
(24, 'Zeus', '$2y$10$I9I6gM.4rCw3fGaU3nOkyOfnv8Q9W.siVCeSyjof7WheSEAgbrYtm', 'estudiante', true, NULL, 1),
(25, 'Hades', '$2y$10$/WGM6.kdAdjfm2CtW8gQXeZdIi571QApjn6FNNZN8cSJljmOfG.j2', 'estudiante', true, NULL, 1),
(26, 'Poseidon', '$2y$10$50rytgCT1tp73xldqffQqOWtjt/jKKk.N7msqXiEfjA2TIYPdXN7m', 'estudiante', true, NULL, 1),
(27, 'Alvin', '$2y$10$ietoImkf4Z/Dd1wsS10RuOVUZ.C9EDabuFeZCtbVh2D2KIAGaN46u', 'estudiante', true, NULL, 2),
(28, 'Mauricio', '$2y$10$hYbnw4dBEkEOaWcJ7As4ZO6PFa0foC7jEeGoW.qEvGEEjuvFGtY8e', 'estudiante', true, NULL, 2);

-- ------------------------------------------------------------
-- Índices y llaves primarias
-- ------------------------------------------------------------
ALTER TABLE "access_logs" ADD PRIMARY KEY ("id");
CREATE INDEX "access_logs_idx_created_at_idx" ON "access_logs" ("created_at");
CREATE INDEX "access_logs_idx_user_action_idx" ON "access_logs" ("user_id","action");
CREATE INDEX "access_logs_idx_action_idx" ON "access_logs" ("action");
ALTER TABLE "archivos" ADD PRIMARY KEY ("id");
CREATE INDEX "archivos_uploaded_by_idx" ON "archivos" ("uploaded_by");
CREATE INDEX "archivos_curso_idx" ON "archivos" ("curso");
ALTER TABLE "ar_cards" ADD PRIMARY KEY ("id");
CREATE UNIQUE INDEX "ar_cards_card_code_key" ON "ar_cards" ("card_code");
CREATE UNIQUE INDEX "ar_cards_user_exercise_card_key" ON "ar_cards" ("user_id","exercise_id");
CREATE INDEX "ar_cards_user_id_idx" ON "ar_cards" ("user_id");
CREATE INDEX "ar_cards_exercise_id_idx" ON "ar_cards" ("exercise_id");
CREATE INDEX "ar_cards_lesson_id_idx" ON "ar_cards" ("lesson_id");
CREATE INDEX "ar_cards_exam_id_idx" ON "ar_cards" ("exam_id");
CREATE INDEX "ar_cards_idx_is_unlocked_idx" ON "ar_cards" ("is_unlocked");
ALTER TABLE "content_order" ADD PRIMARY KEY ("id");
CREATE UNIQUE INDEX "content_order_unique_content_key" ON "content_order" ("curso_id","content_type","content_id");
CREATE INDEX "content_order_idx_curso_orden_idx" ON "content_order" ("curso_id","orden");
CREATE INDEX "content_order_idx_content_idx" ON "content_order" ("content_type","content_id");
ALTER TABLE "curso" ADD PRIMARY KEY ("id_cur");
CREATE INDEX "curso_id_doc_idx" ON "curso" ("id_doc");
ALTER TABLE "diccionario" ADD PRIMARY KEY ("id");
ALTER TABLE "difficulty_levels" ADD PRIMARY KEY ("id");
CREATE UNIQUE INDEX "difficulty_levels_level_code_key" ON "difficulty_levels" ("level_code");
ALTER TABLE "error_patterns" ADD PRIMARY KEY ("id");
CREATE INDEX "error_patterns_idx_user_exercise_idx" ON "error_patterns" ("user_id","exercise_id");
CREATE INDEX "error_patterns_idx_error_type_idx" ON "error_patterns" ("error_type");
CREATE INDEX "error_patterns_idx_lesson_idx" ON "error_patterns" ("lesson_id");
ALTER TABLE "exams" ADD PRIMARY KEY ("id");
CREATE INDEX "exams_lesson_id_idx" ON "exams" ("lesson_id");
CREATE INDEX "exams_created_by_idx" ON "exams" ("created_by");
CREATE INDEX "exams_position_order_idx" ON "exams" ("position_order");
CREATE INDEX "exams_idx_ar_card_id_idx" ON "exams" ("ar_card_id");
ALTER TABLE "exam_attempts" ADD PRIMARY KEY ("id");
CREATE INDEX "exam_attempts_exam_id_idx" ON "exam_attempts" ("exam_id");
CREATE INDEX "exam_attempts_user_id_idx" ON "exam_attempts" ("user_id");
CREATE INDEX "exam_attempts_result_id_idx" ON "exam_attempts" ("result_id");
ALTER TABLE "exam_details" ADD PRIMARY KEY ("id");
CREATE UNIQUE INDEX "exam_details_exam_config_type_key" ON "exam_details" ("exam_id","config_type");
CREATE INDEX "exam_details_exam_id_idx" ON "exam_details" ("exam_id");
ALTER TABLE "exam_results" ADD PRIMARY KEY ("id");
CREATE INDEX "exam_results_user_id_idx" ON "exam_results" ("user_id");
CREATE INDEX "exam_results_lesson_id_idx" ON "exam_results" ("lesson_id");
CREATE INDEX "exam_results_exam_id_idx" ON "exam_results" ("exam_id");
ALTER TABLE "exercises" ADD PRIMARY KEY ("id");
CREATE INDEX "exercises_lesson_id_idx" ON "exercises" ("lesson_id");
ALTER TABLE "exercise_attempts" ADD PRIMARY KEY ("id");
CREATE INDEX "exercise_attempts_idx_user_exercise_idx" ON "exercise_attempts" ("user_id","exercise_id");
CREATE INDEX "exercise_attempts_idx_lesson_idx" ON "exercise_attempts" ("lesson_id");
CREATE INDEX "exercise_attempts_idx_attempt_number_idx" ON "exercise_attempts" ("attempt_number");
CREATE INDEX "exercise_attempts_idx_created_at_idx" ON "exercise_attempts" ("created_at");
CREATE INDEX "exercise_attempts_fk_exercise_attempts_exercise_idx" ON "exercise_attempts" ("exercise_id");
CREATE INDEX "exercise_attempts_idx_exercise_attempts_user_lesson_idx" ON "exercise_attempts" ("user_id","lesson_id");
CREATE INDEX "exercise_attempts_idx_exercise_attempts_is_correct_idx" ON "exercise_attempts" ("is_correct");
ALTER TABLE "exercise_types" ADD PRIMARY KEY ("id");
CREATE UNIQUE INDEX "exercise_types_type_code_key" ON "exercise_types" ("type_code");
ALTER TABLE "fill_in_the_blank_answers" ADD PRIMARY KEY ("id");
CREATE INDEX "fill_in_the_blank_answers_exercise_id_idx" ON "fill_in_the_blank_answers" ("exercise_id");
ALTER TABLE "lessons" ADD PRIMARY KEY ("id");
CREATE INDEX "lessons_curso_idx" ON "lessons" ("curso");
CREATE INDEX "lessons_exam_id_idx" ON "lessons" ("exam_id");
CREATE INDEX "lessons_idx_default_topic_idx" ON "lessons" ("default_topic_id");
CREATE INDEX "lessons_idx_ar_card_id_idx" ON "lessons" ("ar_card_id");
ALTER TABLE "lesson_topics" ADD PRIMARY KEY ("id");
CREATE INDEX "lesson_topics_idx_lesson_id_idx" ON "lesson_topics" ("lesson_id");
CREATE INDEX "lesson_topics_idx_activo_idx" ON "lesson_topics" ("activo");
ALTER TABLE "matching_pairs" ADD PRIMARY KEY ("id");
CREATE INDEX "matching_pairs_exercise_id_idx" ON "matching_pairs" ("exercise_id");
ALTER TABLE "multiple_choice_options" ADD PRIMARY KEY ("id");
CREATE INDEX "multiple_choice_options_exercise_id_idx" ON "multiple_choice_options" ("exercise_id");
ALTER TABLE "search_history" ADD PRIMARY KEY ("id");
ALTER TABLE "statistics_aggregated" ADD PRIMARY KEY ("id");
CREATE UNIQUE INDEX "statistics_aggregated_unique_stat_key" ON "statistics_aggregated" ("user_id","exercise_id","lesson_id","curso_id","stat_type");
CREATE INDEX "statistics_aggregated_idx_stat_type_idx" ON "statistics_aggregated" ("stat_type");
CREATE INDEX "statistics_aggregated_idx_user_id_idx" ON "statistics_aggregated" ("user_id");
CREATE INDEX "statistics_aggregated_idx_exercise_id_idx" ON "statistics_aggregated" ("exercise_id");
CREATE INDEX "statistics_aggregated_idx_lesson_id_idx" ON "statistics_aggregated" ("lesson_id");
CREATE INDEX "statistics_aggregated_idx_curso_id_idx" ON "statistics_aggregated" ("curso_id");
CREATE INDEX "statistics_aggregated_idx_statistics_aggregated_last_calculated_idx" ON "statistics_aggregated" ("last_calculated");
ALTER TABLE "topic_readings" ADD PRIMARY KEY ("id");
CREATE UNIQUE INDEX "topic_readings_unique_user_topic_forced_key" ON "topic_readings" ("user_id","topic_id","exercise_id","forced_by_failures");
CREATE INDEX "topic_readings_idx_user_lesson_idx" ON "topic_readings" ("user_id","lesson_id");
CREATE INDEX "topic_readings_idx_reading_completed_idx" ON "topic_readings" ("reading_completed");
CREATE INDEX "topic_readings_fk_topic_readings_topic_idx" ON "topic_readings" ("topic_id");
CREATE INDEX "topic_readings_fk_topic_readings_lesson_idx" ON "topic_readings" ("lesson_id");
CREATE INDEX "topic_readings_fk_topic_readings_exercise_idx" ON "topic_readings" ("exercise_id");
ALTER TABLE "user_ar_cards" ADD PRIMARY KEY ("id");
CREATE UNIQUE INDEX "user_ar_cards_user_card_key" ON "user_ar_cards" ("user_id","ar_card_id");
CREATE INDEX "user_ar_cards_user_id_idx" ON "user_ar_cards" ("user_id");
CREATE INDEX "user_ar_cards_ar_card_id_idx" ON "user_ar_cards" ("ar_card_id");
ALTER TABLE "user_attempts" ADD PRIMARY KEY ("id");
CREATE INDEX "user_attempts_idx_user_lesson_idx" ON "user_attempts" ("user_id","lesson_id");
ALTER TABLE "user_attempt_details" ADD PRIMARY KEY ("id");
CREATE INDEX "user_attempt_details_attempt_id_idx" ON "user_attempt_details" ("attempt_id");
ALTER TABLE "user_progress" ADD PRIMARY KEY ("id");
CREATE UNIQUE INDEX "user_progress_unique_progress_key" ON "user_progress" ("user_id","lesson_id","date");
CREATE INDEX "user_progress_exercise_id_idx" ON "user_progress" ("exercise_id");
CREATE INDEX "user_progress_user_exercise_idx" ON "user_progress" ("user_id","exercise_id");
ALTER TABLE "usuarios" ADD PRIMARY KEY ("id");
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios" ("email");
CREATE INDEX "usuarios_curso_idx" ON "usuarios" ("curso");

-- ------------------------------------------------------------
-- Reinicio de secuencias (AUTO_INCREMENT)
-- ------------------------------------------------------------
SELECT setval('"access_logs_id_seq"', 187, true);
SELECT setval('"archivos_id_seq"', 1, true);
SELECT setval('"ar_cards_id_seq"', 3, true);
SELECT setval('"content_order_id_seq"', 9, true);
SELECT setval('"curso_id_cur_seq"', 2, true);
SELECT setval('"diccionario_id_seq"', 368, true);
SELECT setval('"difficulty_levels_id_seq"', 3, true);
SELECT setval('"exams_id_seq"', 5, true);
SELECT setval('"exam_attempts_id_seq"', 9, true);
SELECT setval('"exam_details_id_seq"', 31, true);
SELECT setval('"exam_results_id_seq"', 3, true);
SELECT setval('"exercises_id_seq"', 23, true);
SELECT setval('"exercise_attempts_id_seq"', 2, true);
SELECT setval('"exercise_types_id_seq"', 4, true);
SELECT setval('"fill_in_the_blank_answers_id_seq"', 7, true);
SELECT setval('"lessons_id_seq"', 7, true);
SELECT setval('"lesson_topics_id_seq"', 7, true);
SELECT setval('"matching_pairs_id_seq"', 79, true);
SELECT setval('"multiple_choice_options_id_seq"', 24, true);
SELECT setval('"search_history_id_seq"', 17, true);
SELECT setval('"statistics_aggregated_id_seq"', 5, true);
SELECT setval('"user_ar_cards_id_seq"', 3, true);
SELECT setval('"user_attempts_id_seq"', 22, true);
SELECT setval('"user_attempt_details_id_seq"', 112, true);
SELECT setval('"user_progress_id_seq"', 61, true);
SELECT setval('"usuarios_id_seq"', 28, true);

-- ------------------------------------------------------------
-- Llaves foráneas
-- ------------------------------------------------------------
ALTER TABLE "archivos" ADD CONSTRAINT "archivos_ibfk_1" FOREIGN KEY ("uploaded_by") REFERENCES "usuarios" ("id");
ALTER TABLE "archivos" ADD CONSTRAINT "archivos_ibfk_2" FOREIGN KEY ("curso") REFERENCES "curso" ("id_cur");
ALTER TABLE "ar_cards" ADD CONSTRAINT "ar_cards_ibfk_exam" FOREIGN KEY ("exam_id") REFERENCES "exams" ("id") ON DELETE SET NULL;
ALTER TABLE "curso" ADD CONSTRAINT "curso_ibfk_1" FOREIGN KEY ("id_doc") REFERENCES "usuarios" ("id");
ALTER TABLE "exams" ADD CONSTRAINT "exams_ibfk_2" FOREIGN KEY ("created_by") REFERENCES "usuarios" ("id") ON DELETE CASCADE;
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_ibfk_1" FOREIGN KEY ("exam_id") REFERENCES "exams" ("id") ON DELETE CASCADE;
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_ibfk_2" FOREIGN KEY ("user_id") REFERENCES "usuarios" ("id") ON DELETE CASCADE;
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_ibfk_3" FOREIGN KEY ("result_id") REFERENCES "exam_results" ("id") ON DELETE SET NULL;
ALTER TABLE "exam_details" ADD CONSTRAINT "exam_details_ibfk_1" FOREIGN KEY ("exam_id") REFERENCES "exams" ("id") ON DELETE CASCADE;
ALTER TABLE "exam_results" ADD CONSTRAINT "exam_results_ibfk_exam" FOREIGN KEY ("exam_id") REFERENCES "exams" ("id") ON DELETE SET NULL;
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_ibfk_1" FOREIGN KEY ("lesson_id") REFERENCES "lessons" ("id") ON DELETE CASCADE;
ALTER TABLE "exercise_attempts" ADD CONSTRAINT "fk_exercise_attempts_exercise" FOREIGN KEY ("exercise_id") REFERENCES "exercises" ("id") ON DELETE CASCADE;
ALTER TABLE "exercise_attempts" ADD CONSTRAINT "fk_exercise_attempts_lesson" FOREIGN KEY ("lesson_id") REFERENCES "lessons" ("id") ON DELETE CASCADE;
ALTER TABLE "exercise_attempts" ADD CONSTRAINT "fk_exercise_attempts_user" FOREIGN KEY ("user_id") REFERENCES "usuarios" ("id") ON DELETE CASCADE;
ALTER TABLE "fill_in_the_blank_answers" ADD CONSTRAINT "fill_in_the_blank_answers_ibfk_1" FOREIGN KEY ("exercise_id") REFERENCES "exercises" ("id") ON DELETE CASCADE;
ALTER TABLE "lessons" ADD CONSTRAINT "fk_lesson_exam" FOREIGN KEY ("exam_id") REFERENCES "exams" ("id") ON DELETE SET NULL;
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_ibfk_1" FOREIGN KEY ("curso") REFERENCES "curso" ("id_cur");
ALTER TABLE "lesson_topics" ADD CONSTRAINT "fk_lesson_topics_lesson" FOREIGN KEY ("lesson_id") REFERENCES "lessons" ("id") ON DELETE CASCADE;
ALTER TABLE "matching_pairs" ADD CONSTRAINT "matching_pairs_ibfk_1" FOREIGN KEY ("exercise_id") REFERENCES "exercises" ("id") ON DELETE CASCADE;
ALTER TABLE "multiple_choice_options" ADD CONSTRAINT "multiple_choice_options_ibfk_1" FOREIGN KEY ("exercise_id") REFERENCES "exercises" ("id") ON DELETE CASCADE;
ALTER TABLE "topic_readings" ADD CONSTRAINT "fk_topic_readings_exercise" FOREIGN KEY ("exercise_id") REFERENCES "exercises" ("id") ON DELETE SET NULL;
ALTER TABLE "topic_readings" ADD CONSTRAINT "fk_topic_readings_lesson" FOREIGN KEY ("lesson_id") REFERENCES "lessons" ("id") ON DELETE CASCADE;
ALTER TABLE "topic_readings" ADD CONSTRAINT "fk_topic_readings_topic" FOREIGN KEY ("topic_id") REFERENCES "lesson_topics" ("id") ON DELETE CASCADE;
ALTER TABLE "topic_readings" ADD CONSTRAINT "fk_topic_readings_user" FOREIGN KEY ("user_id") REFERENCES "usuarios" ("id") ON DELETE CASCADE;
ALTER TABLE "user_ar_cards" ADD CONSTRAINT "user_ar_cards_ibfk_1" FOREIGN KEY ("user_id") REFERENCES "usuarios" ("id") ON DELETE CASCADE;
ALTER TABLE "user_ar_cards" ADD CONSTRAINT "user_ar_cards_ibfk_2" FOREIGN KEY ("ar_card_id") REFERENCES "ar_cards" ("id") ON DELETE CASCADE;
ALTER TABLE "user_attempt_details" ADD CONSTRAINT "user_attempt_details_ibfk_1" FOREIGN KEY ("attempt_id") REFERENCES "user_attempts" ("id") ON DELETE CASCADE;
ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_ibfk_1" FOREIGN KEY ("user_id") REFERENCES "usuarios" ("id");
ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_ibfk_exercise" FOREIGN KEY ("exercise_id") REFERENCES "exercises" ("id") ON DELETE CASCADE;
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_ibfk_1" FOREIGN KEY ("curso") REFERENCES "curso" ("id_cur");

-- ------------------------------------------------------------
-- Triggers para columnas ON UPDATE CURRENT_TIMESTAMP
-- ------------------------------------------------------------
DROP TRIGGER IF EXISTS "trg_content_order_updated_at_updated_at" ON "content_order";
CREATE TRIGGER "trg_content_order_updated_at_updated_at" BEFORE UPDATE ON "content_order"
  FOR EACH ROW EXECUTE FUNCTION "set_updated_at_timestamp"();
DROP TRIGGER IF EXISTS "trg_exams_updated_at_updated_at" ON "exams";
CREATE TRIGGER "trg_exams_updated_at_updated_at" BEFORE UPDATE ON "exams"
  FOR EACH ROW EXECUTE FUNCTION "set_updated_at_timestamp"();
DROP TRIGGER IF EXISTS "trg_exam_details_updated_at_updated_at" ON "exam_details";
CREATE TRIGGER "trg_exam_details_updated_at_updated_at" BEFORE UPDATE ON "exam_details"
  FOR EACH ROW EXECUTE FUNCTION "set_updated_at_timestamp"();
DROP TRIGGER IF EXISTS "trg_lesson_topics_updated_at_updated_at" ON "lesson_topics";
CREATE TRIGGER "trg_lesson_topics_updated_at_updated_at" BEFORE UPDATE ON "lesson_topics"
  FOR EACH ROW EXECUTE FUNCTION "set_updated_at_timestamp"();
DROP TRIGGER IF EXISTS "trg_statistics_aggregated_updated_at_updated_at" ON "statistics_aggregated";
CREATE TRIGGER "trg_statistics_aggregated_updated_at_updated_at" BEFORE UPDATE ON "statistics_aggregated"
  FOR EACH ROW EXECUTE FUNCTION "set_updated_at_timestamp"();
DROP TRIGGER IF EXISTS "trg_topic_readings_updated_at_updated_at" ON "topic_readings";
CREATE TRIGGER "trg_topic_readings_updated_at_updated_at" BEFORE UPDATE ON "topic_readings"
  FOR EACH ROW EXECUTE FUNCTION "set_updated_at_timestamp"();
DROP TRIGGER IF EXISTS "trg_user_progress_last_seen_at_updated_at" ON "user_progress";
CREATE TRIGGER "trg_user_progress_last_seen_at_updated_at" BEFORE UPDATE ON "user_progress"
  FOR EACH ROW EXECUTE FUNCTION "set_last_seen_at_timestamp"();
DROP TRIGGER IF EXISTS "trg_user_progress_updated_at_updated_at" ON "user_progress";
CREATE TRIGGER "trg_user_progress_updated_at_updated_at" BEFORE UPDATE ON "user_progress"
  FOR EACH ROW EXECUTE FUNCTION "set_updated_at_timestamp"();

COMMIT;