-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "usuarios_role_enum" AS ENUM ('maestro', 'estudiante', 'admin');

-- CreateEnum
CREATE TYPE "estado_contenido_enum" AS ENUM ('activo', 'inactivo', 'retirado', 'archivado', 'deshabilitado');

-- CreateEnum
CREATE TYPE "estado_alumno_enum" AS ENUM ('activo', 'inactivo', 'retirado', 'reincorporado', 'egresado', 'promovido', 'trasladado', 'repitente');

-- CreateEnum
CREATE TYPE "estado_gestion_enum" AS ENUM ('planificada', 'activa', 'cerrada', 'archivada');

-- CreateEnum
CREATE TYPE "dificultad_enum" AS ENUM ('facil', 'medio', 'dificil');

-- CreateEnum
CREATE TYPE "exercises_type_enum" AS ENUM ('text', 'multiple_choice', 'matching', 'fill_in_the_blank', 'image_guess', 'drag_card');

-- CreateEnum
CREATE TYPE "exams_type_enum" AS ENUM ('conectar_palabras', 'ar_exam');

-- CreateEnum
CREATE TYPE "exam_attempt_policy_enum" AS ENUM ('best', 'last', 'first', 'average');

-- CreateEnum
CREATE TYPE "pass_policy_enum" AS ENUM ('por_minimo', 'todos');

-- CreateEnum
CREATE TYPE "tipo_cambio_enum" AS ENUM ('menor', 'mayor');

-- CreateEnum
CREATE TYPE "movimiento_tipo_enum" AS ENUM ('alta', 'promocion', 'cambio_paralelo', 'retiro', 'reincorporacion', 'repitencia');

-- CreateEnum
CREATE TYPE "ar_card_unlock_type_enum" AS ENUM ('lesson', 'exam');

-- CreateEnum
CREATE TYPE "logro_categoria_enum" AS ENUM ('lecciones', 'racha', 'rendimiento', 'examenes', 'tarjetas');

-- CreateEnum
CREATE TYPE "content_order_content_type_enum" AS ENUM ('lesson', 'exam');

-- CreateEnum
CREATE TYPE "exam_details_config_type_enum" AS ENUM ('categories', 'ar_markers', 'ar_cards');

-- CreateEnum
CREATE TYPE "statistics_stat_type_enum" AS ENUM ('exercise', 'lesson', 'paralelo', 'student', 'gestion');

-- CreateEnum
CREATE TYPE "prediccion_tipo_enum" AS ENUM ('riesgo_bajo_rendimiento', 'tendencia', 'refuerzo_sugerido', 'score_predicho');

-- CreateEnum
CREATE TYPE "access_logs_action_enum" AS ENUM ('login_success', 'login_failed', 'logout', 'view', 'create', 'update', 'delete');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "role" "usuarios_role_enum" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "email" VARCHAR(120),
    "nombre" VARCHAR(120),
    "apellido" VARCHAR(120),
    "codigo_estudiante" VARCHAR(40),
    "fecha_nacimiento" DATE,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gestiones" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(60) NOT NULL,
    "anio" INTEGER NOT NULL,
    "fecha_inicio" DATE NOT NULL,
    "fecha_fin" DATE NOT NULL,
    "estado" "estado_gestion_enum" NOT NULL DEFAULT 'planificada',
    "es_actual" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gestiones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grados" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(60) NOT NULL,
    "nivel" INTEGER NOT NULL,
    "estado" "estado_contenido_enum" NOT NULL DEFAULT 'activo',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paralelos" (
    "id" SERIAL NOT NULL,
    "gestion_id" INTEGER NOT NULL,
    "grado_id" INTEGER NOT NULL,
    "nombre" VARCHAR(10) NOT NULL,
    "profesor_id" INTEGER,
    "estado" "estado_contenido_enum" NOT NULL DEFAULT 'activo',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "paralelos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asignaciones_profesor" (
    "id" SERIAL NOT NULL,
    "paralelo_id" INTEGER NOT NULL,
    "profesor_id" INTEGER NOT NULL,
    "fecha_desde" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_hasta" TIMESTAMP(6),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asignaciones_profesor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inscripciones" (
    "id" SERIAL NOT NULL,
    "alumno_id" INTEGER NOT NULL,
    "paralelo_id" INTEGER NOT NULL,
    "estado" "estado_alumno_enum" NOT NULL DEFAULT 'activo',
    "fecha_inscripcion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_baja" TIMESTAMP(6),
    "motivo" VARCHAR(255),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "inscripciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos_academicos" (
    "id" SERIAL NOT NULL,
    "inscripcion_id" INTEGER NOT NULL,
    "tipo" "movimiento_tipo_enum" NOT NULL,
    "fecha" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "realizado_por" INTEGER NOT NULL,
    "datos_previos" JSONB,
    "datos_nuevos" JSONB,

    CONSTRAINT "movimientos_academicos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lessons" (
    "id" SERIAL NOT NULL,
    "paralelo_id" INTEGER NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 1,
    "estado" "estado_contenido_enum" NOT NULL DEFAULT 'activo',
    "min_correct" INTEGER NOT NULL DEFAULT 1,
    "present_count" INTEGER,
    "random_selection" BOOLEAN NOT NULL DEFAULT false,
    "pass_policy" "pass_policy_enum" NOT NULL DEFAULT 'por_minimo',
    "content_epoch" INTEGER NOT NULL DEFAULT 1,
    "min_valid_version" INTEGER NOT NULL DEFAULT 1,
    "grants_ar" BOOLEAN NOT NULL DEFAULT false,
    "ar_card_id" INTEGER,
    "default_topic_id" INTEGER,
    "copiado_de" INTEGER,
    "created_by" INTEGER,
    "updated_by" INTEGER,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_versions" (
    "id" SERIAL NOT NULL,
    "lesson_id" INTEGER NOT NULL,
    "version" INTEGER NOT NULL,
    "tipo_cambio" "tipo_cambio_enum" NOT NULL,
    "resumen" VARCHAR(500) NOT NULL,
    "created_by" INTEGER,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vigente" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "lesson_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_topics" (
    "id" SERIAL NOT NULL,
    "lesson_id" INTEGER NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "content" TEXT,
    "archivo_id" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,
    "estado" "estado_contenido_enum" NOT NULL DEFAULT 'activo',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "lesson_topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topic_slides" (
    "id" SERIAL NOT NULL,
    "topic_id" INTEGER NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "layout" VARCHAR(30) NOT NULL DEFAULT 'imagen-izquierda',
    "title" VARCHAR(255) NOT NULL DEFAULT '',
    "body" TEXT NOT NULL DEFAULT '',
    "image_id" INTEGER,
    "audio_id" INTEGER,
    "canvas" JSONB,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "topic_slides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topic_media" (
    "id" SERIAL NOT NULL,
    "topic_id" INTEGER NOT NULL,
    "kind" VARCHAR(10) NOT NULL,
    "nombre" VARCHAR(255) NOT NULL,
    "mime" VARCHAR(120) NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "topic_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "archivos" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(255) NOT NULL,
    "ruta" VARCHAR(500) NOT NULL,
    "mime" VARCHAR(120),
    "size_bytes" INTEGER,
    "uploaded_by" INTEGER,
    "paralelo_id" INTEGER,
    "estado" "estado_contenido_enum" NOT NULL DEFAULT 'activo',
    "fecha_subida" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "archivos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercises" (
    "id" SERIAL NOT NULL,
    "paralelo_id" INTEGER NOT NULL,
    "lesson_id_origen" INTEGER,
    "type" "exercises_type_enum" NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "dificultad" "dificultad_enum" NOT NULL DEFAULT 'medio',
    "estado" "estado_contenido_enum" NOT NULL DEFAULT 'activo',
    "copiado_de" INTEGER,
    "image_id" INTEGER,
    "config" JSONB,
    "created_by" INTEGER,
    "updated_by" INTEGER,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_exercises" (
    "id" SERIAL NOT NULL,
    "lesson_id" INTEGER NOT NULL,
    "exercise_id" INTEGER NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "estado" "estado_contenido_enum" NOT NULL DEFAULT 'activo',
    "added_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lesson_exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "multiple_choice_options" (
    "id" SERIAL NOT NULL,
    "exercise_id" INTEGER NOT NULL,
    "option_text" VARCHAR(255),
    "option_image" VARCHAR(255),
    "image_id" INTEGER,
    "is_correct" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "multiple_choice_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercise_media" (
    "id" SERIAL NOT NULL,
    "paralelo_id" INTEGER NOT NULL,
    "nombre" VARCHAR(255) NOT NULL,
    "mime" VARCHAR(120) NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exercise_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercise_plays" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "exercise_id" INTEGER NOT NULL,
    "fallos" INTEGER NOT NULL DEFAULT 0,
    "resuelto" BOOLEAN NOT NULL DEFAULT false,
    "terminado" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "exercise_plays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matching_pairs" (
    "id" SERIAL NOT NULL,
    "exercise_id" INTEGER NOT NULL,
    "aymara_word" VARCHAR(255) NOT NULL,
    "spanish_word" VARCHAR(255) NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "matching_pairs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fill_in_the_blank_answers" (
    "id" SERIAL NOT NULL,
    "exercise_id" INTEGER NOT NULL,
    "answer_text" VARCHAR(255) NOT NULL,

    CONSTRAINT "fill_in_the_blank_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_attempts" (
    "id" SERIAL NOT NULL,
    "alumno_id" INTEGER NOT NULL,
    "lesson_id" INTEGER NOT NULL,
    "paralelo_id" INTEGER NOT NULL,
    "attempt_no" INTEGER NOT NULL DEFAULT 1,
    "started_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(6),
    "presented_exercise_ids" INTEGER[],
    "presented_count" INTEGER NOT NULL DEFAULT 0,
    "correct_count" INTEGER NOT NULL DEFAULT 0,
    "min_required" INTEGER NOT NULL DEFAULT 0,
    "score" INTEGER NOT NULL DEFAULT 0,
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "best_flag" BOOLEAN NOT NULL DEFAULT false,
    "lesson_version" INTEGER NOT NULL DEFAULT 1,
    "estado" "estado_contenido_enum" NOT NULL DEFAULT 'activo',

    CONSTRAINT "lesson_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercise_attempts" (
    "id" SERIAL NOT NULL,
    "lesson_attempt_id" INTEGER,
    "alumno_id" INTEGER NOT NULL,
    "exercise_id" INTEGER NOT NULL,
    "lesson_id" INTEGER NOT NULL,
    "paralelo_id" INTEGER,
    "exercise_type" "exercises_type_enum",
    "dificultad" "dificultad_enum" NOT NULL DEFAULT 'medio',
    "attempt_number" INTEGER NOT NULL DEFAULT 1,
    "user_answer" TEXT,
    "is_correct" BOOLEAN NOT NULL DEFAULT false,
    "score" INTEGER NOT NULL DEFAULT 0,
    "time_spent_ms" INTEGER NOT NULL DEFAULT 0,
    "error_type" VARCHAR(100),
    "error_details" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exercise_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_progress" (
    "id" SERIAL NOT NULL,
    "alumno_id" INTEGER NOT NULL,
    "lesson_id" INTEGER NOT NULL,
    "lesson_version" INTEGER NOT NULL DEFAULT 1,
    "current_index" INTEGER NOT NULL DEFAULT 0,
    "total_exercises" INTEGER NOT NULL DEFAULT 0,
    "best_score" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "in_progress" BOOLEAN NOT NULL DEFAULT false,
    "last_seen_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "user_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topic_readings" (
    "id" SERIAL NOT NULL,
    "alumno_id" INTEGER NOT NULL,
    "topic_id" INTEGER NOT NULL,
    "lesson_id" INTEGER NOT NULL,
    "reading_completed" BOOLEAN NOT NULL DEFAULT false,
    "reading_started_at" TIMESTAMP(6),
    "reading_completed_at" TIMESTAMP(6),
    "time_spent_ms" INTEGER NOT NULL DEFAULT 0,
    "forced_by_failures" BOOLEAN NOT NULL DEFAULT false,
    "failure_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "topic_readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exams" (
    "id" SERIAL NOT NULL,
    "paralelo_id" INTEGER NOT NULL,
    "type" "exams_type_enum" NOT NULL DEFAULT 'conectar_palabras',
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "time_limit" INTEGER,
    "start_date" TIMESTAMP(6),
    "end_date" TIMESTAMP(6),
    "min_score" INTEGER NOT NULL DEFAULT 70,
    "max_attempts" INTEGER,
    "attempt_policy" "exam_attempt_policy_enum" NOT NULL DEFAULT 'best',
    "ar_card_id" INTEGER,
    "position_order" INTEGER,
    "estado" "estado_contenido_enum" NOT NULL DEFAULT 'activo',
    "copiado_de" INTEGER,
    "created_by" INTEGER,
    "updated_by" INTEGER,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_prerequisitos" (
    "id" SERIAL NOT NULL,
    "exam_id" INTEGER NOT NULL,
    "lesson_id" INTEGER NOT NULL,

    CONSTRAINT "exam_prerequisitos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_ar_cards" (
    "id" SERIAL NOT NULL,
    "exam_id" INTEGER NOT NULL,
    "ar_card_id" INTEGER NOT NULL,

    CONSTRAINT "exam_ar_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_details" (
    "id" SERIAL NOT NULL,
    "exam_id" INTEGER NOT NULL,
    "config_type" "exam_details_config_type_enum" NOT NULL,
    "config_value" TEXT NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "exam_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_attempts" (
    "id" SERIAL NOT NULL,
    "exam_id" INTEGER NOT NULL,
    "alumno_id" INTEGER NOT NULL,
    "attempt_no" INTEGER NOT NULL DEFAULT 1,
    "started_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(6),
    "time_spent_ms" INTEGER NOT NULL DEFAULT 0,
    "score" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "estado" "estado_contenido_enum" NOT NULL DEFAULT 'activo',
    "ar_card_granted_id" INTEGER,
    "progreso" JSONB,
    "errores" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "exam_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_attempt_details" (
    "id" SERIAL NOT NULL,
    "exam_attempt_id" INTEGER NOT NULL,
    "item_ref" VARCHAR(255) NOT NULL,
    "expected" VARCHAR(255),
    "respuesta" VARCHAR(255),
    "is_correct" BOOLEAN NOT NULL DEFAULT false,
    "time_spent_ms" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_attempt_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ar_cards" (
    "id" SERIAL NOT NULL,
    "paralelo_id" INTEGER NOT NULL,
    "card_code" VARCHAR(50) NOT NULL,
    "title" VARCHAR(255),
    "description" TEXT,
    "marker_file" VARCHAR(255) NOT NULL,
    "image_file" VARCHAR(255),
    "card_data" TEXT,
    "patt_data" TEXT,
    "image_data" BYTEA,
    "lamina_data" BYTEA,
    "model_data" BYTEA,
    "model_mime" VARCHAR(50),
    "unlock_type" "ar_card_unlock_type_enum" NOT NULL DEFAULT 'lesson',
    "unlock_lesson_id" INTEGER,
    "unlock_exam_id" INTEGER,
    "estado" "estado_contenido_enum" NOT NULL DEFAULT 'activo',
    "deshabilitado_por" INTEGER,
    "deshabilitado_at" TIMESTAMP(6),
    "motivo" VARCHAR(255),
    "copiado_de" INTEGER,
    "created_by" INTEGER,
    "updated_by" INTEGER,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "ar_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_ar_cards" (
    "id" SERIAL NOT NULL,
    "alumno_id" INTEGER NOT NULL,
    "ar_card_id" INTEGER NOT NULL,
    "unlocked_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unlocked_by" "ar_card_unlock_type_enum" NOT NULL DEFAULT 'lesson',
    "source_id" INTEGER,
    "revocado" BOOLEAN NOT NULL DEFAULT false,
    "revocado_at" TIMESTAMP(6),
    "revocado_por" INTEGER,
    "motivo" VARCHAR(255),

    CONSTRAINT "user_ar_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logros" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(60) NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "descripcion" VARCHAR(255),
    "icono" VARCHAR(60),
    "categoria" "logro_categoria_enum" NOT NULL,
    "criterio_tipo" VARCHAR(60) NOT NULL,
    "criterio_valor" INTEGER NOT NULL DEFAULT 1,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "logros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logro_alumnos" (
    "id" SERIAL NOT NULL,
    "alumno_id" INTEGER NOT NULL,
    "logro_id" INTEGER NOT NULL,
    "unlocked_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "progreso" INTEGER,
    "contexto" JSONB,

    CONSTRAINT "logro_alumnos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_order" (
    "id" SERIAL NOT NULL,
    "paralelo_id" INTEGER NOT NULL,
    "content_type" "content_order_content_type_enum" NOT NULL,
    "content_id" INTEGER NOT NULL,
    "orden" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "content_order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diccionario" (
    "id" SERIAL NOT NULL,
    "aymara" VARCHAR(80),
    "espanol" VARCHAR(120),
    "categoria" VARCHAR(60) NOT NULL DEFAULT '',
    "estado" "estado_contenido_enum" NOT NULL DEFAULT 'activo',
    "paralelo_id" INTEGER,

    CONSTRAINT "diccionario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_history" (
    "id" SERIAL NOT NULL,
    "headword" VARCHAR(100) NOT NULL,
    "gloss" VARCHAR(255) NOT NULL,
    "search_date" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comentarios_revision" (
    "id" SERIAL NOT NULL,
    "contenido_tipo" VARCHAR(30) NOT NULL,
    "contenido_id" INTEGER NOT NULL,
    "paralelo_id" INTEGER NOT NULL,
    "autor_id" INTEGER NOT NULL,
    "texto" TEXT NOT NULL,
    "resuelto" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "comentarios_revision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "statistics_aggregated" (
    "id" SERIAL NOT NULL,
    "stat_type" "statistics_stat_type_enum" NOT NULL,
    "alumno_id" INTEGER NOT NULL DEFAULT 0,
    "exercise_id" INTEGER NOT NULL DEFAULT 0,
    "lesson_id" INTEGER NOT NULL DEFAULT 0,
    "paralelo_id" INTEGER NOT NULL DEFAULT 0,
    "gestion_id" INTEGER NOT NULL DEFAULT 0,
    "total_attempts" INTEGER NOT NULL DEFAULT 0,
    "successful_attempts" INTEGER NOT NULL DEFAULT 0,
    "failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "average_score" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "average_time_ms" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "most_common_error" VARCHAR(100),
    "error_pattern" TEXT,
    "difficulty_score" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "predicted_difficulty" "dificultad_enum",
    "last_calculated" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "statistics_aggregated_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "error_patterns" (
    "id" SERIAL NOT NULL,
    "alumno_id" INTEGER,
    "exercise_id" INTEGER,
    "lesson_id" INTEGER,
    "error_type" VARCHAR(100) NOT NULL,
    "error_description" TEXT,
    "frequency" INTEGER NOT NULL DEFAULT 1,
    "pattern_data" TEXT,
    "detected_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_occurrence" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "error_patterns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "predicciones_alumno" (
    "id" SERIAL NOT NULL,
    "alumno_id" INTEGER NOT NULL,
    "paralelo_id" INTEGER NOT NULL DEFAULT 0,
    "tipo" "prediccion_tipo_enum" NOT NULL,
    "valor" DECIMAL(6,3) NOT NULL,
    "etiqueta" VARCHAR(60),
    "confianza" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "features" JSONB,
    "modelo_version" VARCHAR(20) NOT NULL DEFAULT 'v1',
    "calculado_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "predicciones_alumno_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ml_modelos" (
    "id" SERIAL NOT NULL,
    "version" VARCHAR(20) NOT NULL,
    "tipo" VARCHAR(40) NOT NULL,
    "params" JSONB NOT NULL,
    "metricas" JSONB,
    "n_muestras" INTEGER NOT NULL DEFAULT 0,
    "entrenado_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activo" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ml_modelos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_logs" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT,
    "email" VARCHAR(190),
    "username" VARCHAR(190),
    "action" "access_logs_action_enum" NOT NULL,
    "path" VARCHAR(255) NOT NULL,
    "method" VARCHAR(10) NOT NULL,
    "ip" VARCHAR(45) NOT NULL,
    "user_agent" TEXT,
    "status" SMALLINT NOT NULL DEFAULT 200,
    "message" VARCHAR(255),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_username_key" ON "usuarios"("username");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_codigo_estudiante_key" ON "usuarios"("codigo_estudiante");

-- CreateIndex
CREATE INDEX "usuarios_role_idx" ON "usuarios"("role");

-- CreateIndex
CREATE UNIQUE INDEX "gestiones_nombre_key" ON "gestiones"("nombre");

-- CreateIndex
CREATE INDEX "gestiones_es_actual_idx" ON "gestiones"("es_actual");

-- CreateIndex
CREATE UNIQUE INDEX "grados_nivel_key" ON "grados"("nivel");

-- CreateIndex
CREATE INDEX "paralelos_profesor_id_idx" ON "paralelos"("profesor_id");

-- CreateIndex
CREATE INDEX "paralelos_gestion_id_idx" ON "paralelos"("gestion_id");

-- CreateIndex
CREATE UNIQUE INDEX "paralelos_gestion_id_grado_id_nombre_key" ON "paralelos"("gestion_id", "grado_id", "nombre");

-- CreateIndex
CREATE INDEX "asignaciones_profesor_paralelo_id_idx" ON "asignaciones_profesor"("paralelo_id");

-- CreateIndex
CREATE INDEX "asignaciones_profesor_profesor_id_idx" ON "asignaciones_profesor"("profesor_id");

-- CreateIndex
CREATE INDEX "inscripciones_alumno_id_idx" ON "inscripciones"("alumno_id");

-- CreateIndex
CREATE INDEX "inscripciones_paralelo_id_idx" ON "inscripciones"("paralelo_id");

-- CreateIndex
CREATE INDEX "inscripciones_estado_idx" ON "inscripciones"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "inscripciones_alumno_id_paralelo_id_key" ON "inscripciones"("alumno_id", "paralelo_id");

-- CreateIndex
CREATE INDEX "movimientos_academicos_inscripcion_id_idx" ON "movimientos_academicos"("inscripcion_id");

-- CreateIndex
CREATE INDEX "lessons_paralelo_id_orden_idx" ON "lessons"("paralelo_id", "orden");

-- CreateIndex
CREATE INDEX "lessons_ar_card_id_idx" ON "lessons"("ar_card_id");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_versions_lesson_id_version_key" ON "lesson_versions"("lesson_id", "version");

-- CreateIndex
CREATE INDEX "lesson_topics_lesson_id_idx" ON "lesson_topics"("lesson_id");

-- CreateIndex
CREATE INDEX "topic_slides_topic_id_order_idx" ON "topic_slides"("topic_id", "order");

-- CreateIndex
CREATE INDEX "topic_media_topic_id_idx" ON "topic_media"("topic_id");

-- CreateIndex
CREATE INDEX "archivos_paralelo_id_idx" ON "archivos"("paralelo_id");

-- CreateIndex
CREATE INDEX "exercises_paralelo_id_idx" ON "exercises"("paralelo_id");

-- CreateIndex
CREATE INDEX "lesson_exercises_lesson_id_orden_idx" ON "lesson_exercises"("lesson_id", "orden");

-- CreateIndex
CREATE INDEX "lesson_exercises_exercise_id_idx" ON "lesson_exercises"("exercise_id");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_exercises_lesson_id_exercise_id_key" ON "lesson_exercises"("lesson_id", "exercise_id");

-- CreateIndex
CREATE INDEX "multiple_choice_options_exercise_id_idx" ON "multiple_choice_options"("exercise_id");

-- CreateIndex
CREATE INDEX "exercise_media_paralelo_id_idx" ON "exercise_media"("paralelo_id");

-- CreateIndex
CREATE INDEX "exercise_plays_user_id_exercise_id_idx" ON "exercise_plays"("user_id", "exercise_id");

-- CreateIndex
CREATE INDEX "matching_pairs_exercise_id_idx" ON "matching_pairs"("exercise_id");

-- CreateIndex
CREATE INDEX "fill_in_the_blank_answers_exercise_id_idx" ON "fill_in_the_blank_answers"("exercise_id");

-- CreateIndex
CREATE INDEX "lesson_attempts_alumno_id_lesson_id_idx" ON "lesson_attempts"("alumno_id", "lesson_id");

-- CreateIndex
CREATE INDEX "lesson_attempts_lesson_id_idx" ON "lesson_attempts"("lesson_id");

-- CreateIndex
CREATE INDEX "exercise_attempts_alumno_id_exercise_id_idx" ON "exercise_attempts"("alumno_id", "exercise_id");

-- CreateIndex
CREATE INDEX "exercise_attempts_alumno_id_lesson_id_idx" ON "exercise_attempts"("alumno_id", "lesson_id");

-- CreateIndex
CREATE INDEX "exercise_attempts_lesson_id_idx" ON "exercise_attempts"("lesson_id");

-- CreateIndex
CREATE INDEX "exercise_attempts_exercise_id_idx" ON "exercise_attempts"("exercise_id");

-- CreateIndex
CREATE INDEX "exercise_attempts_is_correct_idx" ON "exercise_attempts"("is_correct");

-- CreateIndex
CREATE INDEX "exercise_attempts_created_at_idx" ON "exercise_attempts"("created_at");

-- CreateIndex
CREATE INDEX "user_progress_alumno_id_idx" ON "user_progress"("alumno_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_progress_alumno_id_lesson_id_key" ON "user_progress"("alumno_id", "lesson_id");

-- CreateIndex
CREATE INDEX "topic_readings_alumno_id_lesson_id_idx" ON "topic_readings"("alumno_id", "lesson_id");

-- CreateIndex
CREATE INDEX "topic_readings_topic_id_idx" ON "topic_readings"("topic_id");

-- CreateIndex
CREATE UNIQUE INDEX "topic_readings_alumno_id_topic_id_forced_by_failures_key" ON "topic_readings"("alumno_id", "topic_id", "forced_by_failures");

-- CreateIndex
CREATE INDEX "exams_paralelo_id_idx" ON "exams"("paralelo_id");

-- CreateIndex
CREATE INDEX "exams_ar_card_id_idx" ON "exams"("ar_card_id");

-- CreateIndex
CREATE UNIQUE INDEX "exam_prerequisitos_exam_id_lesson_id_key" ON "exam_prerequisitos"("exam_id", "lesson_id");

-- CreateIndex
CREATE UNIQUE INDEX "exam_ar_cards_exam_id_ar_card_id_key" ON "exam_ar_cards"("exam_id", "ar_card_id");

-- CreateIndex
CREATE UNIQUE INDEX "exam_details_exam_id_config_type_key" ON "exam_details"("exam_id", "config_type");

-- CreateIndex
CREATE INDEX "exam_attempts_exam_id_idx" ON "exam_attempts"("exam_id");

-- CreateIndex
CREATE INDEX "exam_attempts_alumno_id_idx" ON "exam_attempts"("alumno_id");

-- CreateIndex
CREATE INDEX "exam_attempt_details_exam_attempt_id_idx" ON "exam_attempt_details"("exam_attempt_id");

-- CreateIndex
CREATE UNIQUE INDEX "ar_cards_card_code_key" ON "ar_cards"("card_code");

-- CreateIndex
CREATE INDEX "ar_cards_paralelo_id_idx" ON "ar_cards"("paralelo_id");

-- CreateIndex
CREATE INDEX "ar_cards_unlock_lesson_id_idx" ON "ar_cards"("unlock_lesson_id");

-- CreateIndex
CREATE INDEX "ar_cards_unlock_exam_id_idx" ON "ar_cards"("unlock_exam_id");

-- CreateIndex
CREATE INDEX "user_ar_cards_alumno_id_idx" ON "user_ar_cards"("alumno_id");

-- CreateIndex
CREATE INDEX "user_ar_cards_ar_card_id_idx" ON "user_ar_cards"("ar_card_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_ar_cards_alumno_id_ar_card_id_key" ON "user_ar_cards"("alumno_id", "ar_card_id");

-- CreateIndex
CREATE UNIQUE INDEX "logros_codigo_key" ON "logros"("codigo");

-- CreateIndex
CREATE INDEX "logro_alumnos_alumno_id_idx" ON "logro_alumnos"("alumno_id");

-- CreateIndex
CREATE UNIQUE INDEX "logro_alumnos_alumno_id_logro_id_key" ON "logro_alumnos"("alumno_id", "logro_id");

-- CreateIndex
CREATE INDEX "content_order_paralelo_id_orden_idx" ON "content_order"("paralelo_id", "orden");

-- CreateIndex
CREATE UNIQUE INDEX "content_order_paralelo_id_content_type_content_id_key" ON "content_order"("paralelo_id", "content_type", "content_id");

-- CreateIndex
CREATE INDEX "diccionario_categoria_idx" ON "diccionario"("categoria");

-- CreateIndex
CREATE INDEX "diccionario_paralelo_id_idx" ON "diccionario"("paralelo_id");

-- CreateIndex
CREATE INDEX "comentarios_revision_paralelo_id_idx" ON "comentarios_revision"("paralelo_id");

-- CreateIndex
CREATE INDEX "comentarios_revision_contenido_tipo_contenido_id_idx" ON "comentarios_revision"("contenido_tipo", "contenido_id");

-- CreateIndex
CREATE INDEX "statistics_aggregated_stat_type_idx" ON "statistics_aggregated"("stat_type");

-- CreateIndex
CREATE INDEX "statistics_aggregated_paralelo_id_idx" ON "statistics_aggregated"("paralelo_id");

-- CreateIndex
CREATE INDEX "statistics_aggregated_alumno_id_idx" ON "statistics_aggregated"("alumno_id");

-- CreateIndex
CREATE UNIQUE INDEX "statistics_aggregated_stat_type_alumno_id_exercise_id_lesso_key" ON "statistics_aggregated"("stat_type", "alumno_id", "exercise_id", "lesson_id", "paralelo_id", "gestion_id");

-- CreateIndex
CREATE INDEX "error_patterns_alumno_id_exercise_id_idx" ON "error_patterns"("alumno_id", "exercise_id");

-- CreateIndex
CREATE INDEX "error_patterns_error_type_idx" ON "error_patterns"("error_type");

-- CreateIndex
CREATE INDEX "predicciones_alumno_alumno_id_idx" ON "predicciones_alumno"("alumno_id");

-- CreateIndex
CREATE INDEX "predicciones_alumno_paralelo_id_idx" ON "predicciones_alumno"("paralelo_id");

-- CreateIndex
CREATE INDEX "predicciones_alumno_tipo_idx" ON "predicciones_alumno"("tipo");

-- CreateIndex
CREATE UNIQUE INDEX "predicciones_alumno_alumno_id_tipo_modelo_version_key" ON "predicciones_alumno"("alumno_id", "tipo", "modelo_version");

-- CreateIndex
CREATE UNIQUE INDEX "ml_modelos_version_key" ON "ml_modelos"("version");

-- CreateIndex
CREATE INDEX "access_logs_created_at_idx" ON "access_logs"("created_at");

-- CreateIndex
CREATE INDEX "access_logs_user_id_action_idx" ON "access_logs"("user_id", "action");

-- CreateIndex
CREATE INDEX "access_logs_action_idx" ON "access_logs"("action");

-- AddForeignKey
ALTER TABLE "paralelos" ADD CONSTRAINT "paralelos_gestion_id_fkey" FOREIGN KEY ("gestion_id") REFERENCES "gestiones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paralelos" ADD CONSTRAINT "paralelos_grado_id_fkey" FOREIGN KEY ("grado_id") REFERENCES "grados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paralelos" ADD CONSTRAINT "paralelos_profesor_id_fkey" FOREIGN KEY ("profesor_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones_profesor" ADD CONSTRAINT "asignaciones_profesor_paralelo_id_fkey" FOREIGN KEY ("paralelo_id") REFERENCES "paralelos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones_profesor" ADD CONSTRAINT "asignaciones_profesor_profesor_id_fkey" FOREIGN KEY ("profesor_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscripciones" ADD CONSTRAINT "inscripciones_alumno_id_fkey" FOREIGN KEY ("alumno_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscripciones" ADD CONSTRAINT "inscripciones_paralelo_id_fkey" FOREIGN KEY ("paralelo_id") REFERENCES "paralelos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_academicos" ADD CONSTRAINT "movimientos_academicos_inscripcion_id_fkey" FOREIGN KEY ("inscripcion_id") REFERENCES "inscripciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_paralelo_id_fkey" FOREIGN KEY ("paralelo_id") REFERENCES "paralelos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_ar_card_id_fkey" FOREIGN KEY ("ar_card_id") REFERENCES "ar_cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_versions" ADD CONSTRAINT "lesson_versions_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_topics" ADD CONSTRAINT "lesson_topics_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_topics" ADD CONSTRAINT "lesson_topics_archivo_id_fkey" FOREIGN KEY ("archivo_id") REFERENCES "archivos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_slides" ADD CONSTRAINT "topic_slides_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "lesson_topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_slides" ADD CONSTRAINT "topic_slides_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "topic_media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_slides" ADD CONSTRAINT "topic_slides_audio_id_fkey" FOREIGN KEY ("audio_id") REFERENCES "topic_media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_media" ADD CONSTRAINT "topic_media_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "lesson_topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archivos" ADD CONSTRAINT "archivos_paralelo_id_fkey" FOREIGN KEY ("paralelo_id") REFERENCES "paralelos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_paralelo_id_fkey" FOREIGN KEY ("paralelo_id") REFERENCES "paralelos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "exercise_media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_exercises" ADD CONSTRAINT "lesson_exercises_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_exercises" ADD CONSTRAINT "lesson_exercises_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "multiple_choice_options" ADD CONSTRAINT "multiple_choice_options_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "multiple_choice_options" ADD CONSTRAINT "multiple_choice_options_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "exercise_media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_media" ADD CONSTRAINT "exercise_media_paralelo_id_fkey" FOREIGN KEY ("paralelo_id") REFERENCES "paralelos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_plays" ADD CONSTRAINT "exercise_plays_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_plays" ADD CONSTRAINT "exercise_plays_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matching_pairs" ADD CONSTRAINT "matching_pairs_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fill_in_the_blank_answers" ADD CONSTRAINT "fill_in_the_blank_answers_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_attempts" ADD CONSTRAINT "lesson_attempts_alumno_id_fkey" FOREIGN KEY ("alumno_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_attempts" ADD CONSTRAINT "lesson_attempts_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_attempts" ADD CONSTRAINT "exercise_attempts_lesson_attempt_id_fkey" FOREIGN KEY ("lesson_attempt_id") REFERENCES "lesson_attempts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_attempts" ADD CONSTRAINT "exercise_attempts_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_attempts" ADD CONSTRAINT "exercise_attempts_alumno_id_fkey" FOREIGN KEY ("alumno_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_alumno_id_fkey" FOREIGN KEY ("alumno_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_readings" ADD CONSTRAINT "topic_readings_alumno_id_fkey" FOREIGN KEY ("alumno_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_readings" ADD CONSTRAINT "topic_readings_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "lesson_topics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_paralelo_id_fkey" FOREIGN KEY ("paralelo_id") REFERENCES "paralelos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_ar_card_id_fkey" FOREIGN KEY ("ar_card_id") REFERENCES "ar_cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_prerequisitos" ADD CONSTRAINT "exam_prerequisitos_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_prerequisitos" ADD CONSTRAINT "exam_prerequisitos_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_ar_cards" ADD CONSTRAINT "exam_ar_cards_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_ar_cards" ADD CONSTRAINT "exam_ar_cards_ar_card_id_fkey" FOREIGN KEY ("ar_card_id") REFERENCES "ar_cards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_details" ADD CONSTRAINT "exam_details_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_alumno_id_fkey" FOREIGN KEY ("alumno_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_attempt_details" ADD CONSTRAINT "exam_attempt_details_exam_attempt_id_fkey" FOREIGN KEY ("exam_attempt_id") REFERENCES "exam_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ar_cards" ADD CONSTRAINT "ar_cards_paralelo_id_fkey" FOREIGN KEY ("paralelo_id") REFERENCES "paralelos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_ar_cards" ADD CONSTRAINT "user_ar_cards_alumno_id_fkey" FOREIGN KEY ("alumno_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_ar_cards" ADD CONSTRAINT "user_ar_cards_ar_card_id_fkey" FOREIGN KEY ("ar_card_id") REFERENCES "ar_cards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logro_alumnos" ADD CONSTRAINT "logro_alumnos_alumno_id_fkey" FOREIGN KEY ("alumno_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logro_alumnos" ADD CONSTRAINT "logro_alumnos_logro_id_fkey" FOREIGN KEY ("logro_id") REFERENCES "logros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_order" ADD CONSTRAINT "content_order_paralelo_id_fkey" FOREIGN KEY ("paralelo_id") REFERENCES "paralelos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comentarios_revision" ADD CONSTRAINT "comentarios_revision_paralelo_id_fkey" FOREIGN KEY ("paralelo_id") REFERENCES "paralelos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "predicciones_alumno" ADD CONSTRAINT "predicciones_alumno_alumno_id_fkey" FOREIGN KEY ("alumno_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

