-- CreateTable
CREATE TABLE `users` (
    `id` CHAR(36) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `display_name` VARCHAR(191) NULL,
    `first_name` VARCHAR(100) NULL,
    `last_name` VARCHAR(100) NULL,
    `avatar_url` TEXT NULL,
    `email_verified_at` DATETIME(3) NULL,
    `status` ENUM('INVITED', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED') NOT NULL DEFAULT 'ACTIVE',
    `onboarding_state` ENUM('BOOTSTRAPPED', 'PENDING_PROFILE', 'COMPLETE') NOT NULL DEFAULT 'PENDING_PROFILE',
    `bootstrap_seeded_at` DATETIME(3) NULL,
    `last_signed_in_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    INDEX `idx_users_status`(`status`),
    INDEX `idx_users_created_at`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `profiles` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `phone` VARCHAR(50) NULL,
    `bio` TEXT NULL,
    `country` VARCHAR(100) NULL,
    `state` VARCHAR(100) NULL,
    `city` VARCHAR(100) NULL,
    `address_line_1` VARCHAR(191) NULL,
    `address_line_2` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `profiles_user_id_key`(`user_id`),
    INDEX `idx_profiles_location`(`country`, `state`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `accounts` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `type` VARCHAR(50) NOT NULL,
    `provider` VARCHAR(100) NOT NULL,
    `provider_account_id` VARCHAR(191) NOT NULL,
    `refresh_token` TEXT NULL,
    `access_token` TEXT NULL,
    `expires_at` INTEGER NULL,
    `token_type` VARCHAR(50) NULL,
    `scope` TEXT NULL,
    `id_token` TEXT NULL,
    `session_state` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_accounts_user_id`(`user_id`),
    UNIQUE INDEX `uq_accounts_provider_account`(`provider`, `provider_account_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sessions` (
    `id` CHAR(36) NOT NULL,
    `session_token` VARCHAR(191) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `sessions_session_token_key`(`session_token`),
    INDEX `idx_sessions_user_id`(`user_id`),
    INDEX `idx_sessions_expires_at`(`expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `verification_tokens` (
    `identifier` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,

    INDEX `idx_verification_tokens_expires_at`(`expires_at`),
    UNIQUE INDEX `uq_verification_tokens_token`(`token`),
    PRIMARY KEY (`identifier`, `token`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `roles` (
    `id` CHAR(36) NOT NULL,
    `key` VARCHAR(100) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 100,
    `is_system` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `roles_key_key`(`key`),
    INDEX `idx_roles_sort_order`(`sort_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `permissions` (
    `id` CHAR(36) NOT NULL,
    `key` VARCHAR(150) NOT NULL,
    `resource` VARCHAR(100) NOT NULL,
    `action` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `permissions_key_key`(`key`),
    INDEX `idx_permissions_resource_action`(`resource`, `action`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `role_permissions` (
    `role_id` CHAR(36) NOT NULL,
    `permission_id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_role_permissions_permission_id`(`permission_id`),
    PRIMARY KEY (`role_id`, `permission_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_roles` (
    `user_id` CHAR(36) NOT NULL,
    `role_id` CHAR(36) NOT NULL,
    `assigned_by` CHAR(36) NULL,
    `assigned_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expires_at` DATETIME(3) NULL,

    INDEX `idx_user_roles_role_id`(`role_id`),
    INDEX `idx_user_roles_assigned_by`(`assigned_by`),
    PRIMARY KEY (`user_id`, `role_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `projects` (
    `id` CHAR(36) NOT NULL,
    `creator_id` CHAR(36) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `body_html` LONGTEXT NULL,
    `goal_amount` DECIMAL(19, 4) NOT NULL,
    `current_amount` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `currency` CHAR(3) NOT NULL DEFAULT 'NGN',
    `status` ENUM('DRAFT', 'PROPOSED', 'VOTING', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'ARCHIVED') NOT NULL,
    `sector` VARCHAR(100) NULL,
    `country` VARCHAR(100) NULL,
    `state` VARCHAR(100) NULL,
    `cover_image_url` TEXT NULL,
    `featured_rank` INTEGER NULL,
    `published_at` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,
    `cancelled_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `projects_slug_key`(`slug`),
    INDEX `idx_projects_creator_id`(`creator_id`),
    INDEX `idx_projects_status_created_at`(`status`, `created_at`),
    INDEX `idx_projects_published_at`(`published_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_timelines` (
    `id` CHAR(36) NOT NULL,
    `project_id` CHAR(36) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `status` ENUM('DRAFT', 'ACTIVE', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
    `created_by_id` CHAR(36) NULL,
    `published_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `project_timelines_project_id_key`(`project_id`),
    INDEX `idx_project_timelines_status`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_stages` (
    `id` CHAR(36) NOT NULL,
    `timeline_id` CHAR(36) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `stage_order` INTEGER NOT NULL,
    `planned_cost` DECIMAL(19, 4) NOT NULL,
    `actual_cost` DECIMAL(19, 4) NULL,
    `status` ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED') NOT NULL DEFAULT 'PENDING',
    `planned_start_date` DATETIME(3) NULL,
    `planned_end_date` DATETIME(3) NULL,
    `actual_start_date` DATETIME(3) NULL,
    `actual_end_date` DATETIME(3) NULL,
    `completion_notes` TEXT NULL,
    `created_by_id` CHAR(36) NULL,
    `completed_by_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_project_stages_status`(`status`),
    INDEX `idx_project_stages_planned_start_date`(`planned_start_date`),
    UNIQUE INDEX `uq_project_stages_timeline_order`(`timeline_id`, `stage_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_stage_media` (
    `id` CHAR(36) NOT NULL,
    `stage_id` CHAR(36) NOT NULL,
    `kind` ENUM('PLANNED', 'COMPLETION') NOT NULL,
    `storage_key` VARCHAR(255) NOT NULL,
    `public_url` TEXT NULL,
    `caption` VARCHAR(191) NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_project_stage_media_stage_kind`(`stage_id`, `kind`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `voting_periods` (
    `id` CHAR(36) NOT NULL,
    `project_id` CHAR(36) NOT NULL,
    `start_at` DATETIME(3) NOT NULL,
    `end_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `voting_periods_project_id_key`(`project_id`),
    INDEX `idx_voting_periods_window`(`start_at`, `end_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `votes` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `project_id` CHAR(36) NOT NULL,
    `choice` ENUM('SUPPORT', 'OPPOSE', 'ABSTAIN') NOT NULL,
    `eligible_pledge_amount` DECIMAL(19, 4) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_votes_project_choice`(`project_id`, `choice`),
    UNIQUE INDEX `uq_votes_user_project`(`user_id`, `project_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pledges` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NULL,
    `project_id` CHAR(36) NULL,
    `amount` DECIMAL(19, 4) NOT NULL,
    `currency` CHAR(3) NOT NULL DEFAULT 'NGN',
    `pledge_type` ENUM('ONE_TIME', 'RECURRING') NOT NULL,
    `recurrence_interval` ENUM('MONTHLY', 'QUARTERLY', 'YEARLY') NULL,
    `payment_day` ENUM('TODAY', 'FIRST', 'TWENTY_EIGHTH') NULL,
    `status` ENUM('PENDING', 'ACTIVE', 'COMPLETED', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `donor_email` VARCHAR(191) NULL,
    `donor_name` VARCHAR(191) NULL,
    `started_at` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,
    `cancelled_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_pledges_user_status`(`user_id`, `status`),
    INDEX `idx_pledges_project_status`(`project_id`, `status`),
    INDEX `idx_pledges_created_at`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ledger_accounts` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `public_name` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `category` ENUM('INCOME', 'DEPLOYMENT', 'EXPENSE', 'REFUND', 'ADJUSTMENT') NOT NULL,
    `is_system` BOOLEAN NOT NULL DEFAULT false,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ledger_accounts_code_key`(`code`),
    INDEX `idx_ledger_accounts_category_active`(`category`, `is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transactions` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NULL,
    `pledge_id` CHAR(36) NULL,
    `project_id` CHAR(36) NULL,
    `project_stage_id` CHAR(36) NULL,
    `ledger_account_id` CHAR(36) NULL,
    `direction` ENUM('CREDIT', 'DEBIT') NOT NULL,
    `kind` ENUM('PLEDGE', 'DONATION', 'DEPLOYMENT', 'EXPENSE', 'REFUND', 'ADJUSTMENT') NOT NULL,
    `amount` DECIMAL(19, 4) NOT NULL,
    `currency` CHAR(3) NOT NULL DEFAULT 'NGN',
    `status` ENUM('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED') NOT NULL,
    `payment_method` VARCHAR(100) NULL,
    `payment_processor` VARCHAR(100) NULL,
    `payment_reference` VARCHAR(191) NULL,
    `external_reference` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `metadata` JSON NULL,
    `paid_at` DATETIME(3) NULL,
    `posted_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `uq_transactions_payment_reference`(`payment_reference`),
    INDEX `idx_transactions_user_status`(`user_id`, `status`),
    INDEX `idx_transactions_project_kind`(`project_id`, `kind`),
    INDEX `idx_transactions_project_stage_id`(`project_stage_id`),
    INDEX `idx_transactions_ledger_account_id`(`ledger_account_id`),
    INDEX `idx_transactions_posted_at`(`posted_at`),
    INDEX `idx_transactions_kind_status`(`kind`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `states` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `code` VARCHAR(10) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `states_name_key`(`name`),
    UNIQUE INDEX `states_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lgas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `state_id` INTEGER NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_lgas_state_id`(`state_id`),
    UNIQUE INDEX `uq_lgas_state_name`(`state_id`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cases` (
    `id` CHAR(36) NOT NULL,
    `case_reference_id` VARCHAR(50) NOT NULL,
    `reporter_user_id` CHAR(36) NULL,
    `assignee_user_id` CHAR(36) NULL,
    `reviewer_user_id` CHAR(36) NULL,
    `full_name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(50) NOT NULL,
    `email` VARCHAR(191) NULL,
    `state_id` INTEGER NOT NULL,
    `lga_id` INTEGER NOT NULL,
    `town` VARCHAR(191) NOT NULL,
    `reporting_for` ENUM('MYSELF', 'SOMEONE_ELSE') NOT NULL,
    `beneficiary_name` VARCHAR(191) NULL,
    `relationship` VARCHAR(191) NULL,
    `help_type` ENUM('SCHOOL_FEES', 'EDUCATIONAL_MATERIALS', 'INFRASTRUCTURE', 'SCHOLARSHIP', 'HEALTH_WELFARE', 'OTHER') NOT NULL,
    `description` TEXT NOT NULL,
    `info_confirmed` BOOLEAN NOT NULL DEFAULT false,
    `contact_consent` BOOLEAN NOT NULL DEFAULT false,
    `updates_consent` BOOLEAN NOT NULL DEFAULT false,
    `status` ENUM('PENDING', 'REVIEWING', 'APPROVED', 'REJECTED', 'COMPLETED', 'CLOSED') NOT NULL DEFAULT 'PENDING',
    `decision_reason` TEXT NULL,
    `submitted_at` DATETIME(3) NULL,
    `reviewed_at` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `cases_case_reference_id_key`(`case_reference_id`),
    INDEX `idx_cases_status_created_at`(`status`, `created_at`),
    INDEX `idx_cases_location`(`state_id`, `lga_id`),
    INDEX `idx_cases_reporter_user_id`(`reporter_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `case_files` (
    `id` CHAR(36) NOT NULL,
    `case_id` CHAR(36) NOT NULL,
    `uploaded_by_user_id` CHAR(36) NULL,
    `kind` ENUM('SUPPORTING_DOCUMENT', 'IDENTIFICATION', 'MEDICAL_RECORD', 'INVOICE', 'OTHER') NOT NULL DEFAULT 'SUPPORTING_DOCUMENT',
    `storage_key` VARCHAR(255) NOT NULL,
    `file_url` TEXT NULL,
    `file_name` VARCHAR(191) NOT NULL,
    `file_size` INTEGER NOT NULL,
    `mime_type` VARCHAR(100) NOT NULL,
    `checksum` VARCHAR(128) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_case_files_case_id`(`case_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `case_notes` (
    `id` CHAR(36) NOT NULL,
    `case_id` CHAR(36) NOT NULL,
    `author_user_id` CHAR(36) NOT NULL,
    `note` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_case_notes_case_created_at`(`case_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `settings` (
    `id` CHAR(36) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `display_name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `category` VARCHAR(100) NOT NULL,
    `subcategory` VARCHAR(100) NULL,
    `value` JSON NOT NULL,
    `default_value` JSON NULL,
    `data_type` ENUM('STRING', 'NUMBER', 'BOOLEAN', 'JSON', 'EMAIL', 'URL', 'COLOR') NOT NULL,
    `validation_rules` JSON NULL,
    `access_level` ENUM('PUBLIC', 'PROTECTED', 'SENSITIVE') NOT NULL DEFAULT 'PROTECTED',
    `cache_strategy` ENUM('STATIC', 'DYNAMIC', 'REALTIME') NOT NULL DEFAULT 'DYNAMIC',
    `cache_ttl_seconds` INTEGER NOT NULL DEFAULT 300,
    `is_encrypted` BOOLEAN NOT NULL DEFAULT false,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_by_id` CHAR(36) NULL,
    `updated_by_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `settings_key_key`(`key`),
    INDEX `idx_settings_category_subcategory`(`category`, `subcategory`),
    INDEX `idx_settings_access_active`(`access_level`, `is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `events` (
    `id` CHAR(36) NOT NULL,
    `creator_id` CHAR(36) NULL,
    `project_id` CHAR(36) NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `event_type` ENUM('MEETING', 'FUNDRAISER', 'UPDATE', 'OTHER') NOT NULL DEFAULT 'OTHER',
    `status` ENUM('UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELED') NOT NULL DEFAULT 'UPCOMING',
    `start_at` DATETIME(3) NOT NULL,
    `end_at` DATETIME(3) NULL,
    `timezone` VARCHAR(64) NULL,
    `location` VARCHAR(191) NULL,
    `recording_url` TEXT NULL,
    `recording_password` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_events_project_start_at`(`project_id`, `start_at`),
    INDEX `idx_events_status_start_at`(`status`, `start_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` CHAR(36) NOT NULL,
    `actor_user_id` CHAR(36) NULL,
    `actor_type` ENUM('USER', 'SYSTEM', 'JOB', 'WEBHOOK') NOT NULL DEFAULT 'USER',
    `target_user_id` CHAR(36) NULL,
    `entity_type` VARCHAR(100) NOT NULL,
    `entity_id` VARCHAR(100) NULL,
    `action` VARCHAR(100) NOT NULL,
    `summary` TEXT NULL,
    `old_values` JSON NULL,
    `new_values` JSON NULL,
    `metadata` JSON NULL,
    `ip_address` VARCHAR(64) NULL,
    `user_agent` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_audit_logs_entity`(`entity_type`, `entity_id`),
    INDEX `idx_audit_logs_actor_created_at`(`actor_user_id`, `created_at`),
    INDEX `idx_audit_logs_created_at`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `profiles` ADD CONSTRAINT `profiles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `accounts` ADD CONSTRAINT `accounts_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_permission_id_fkey` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_assigned_by_fkey` FOREIGN KEY (`assigned_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projects` ADD CONSTRAINT `projects_creator_id_fkey` FOREIGN KEY (`creator_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_timelines` ADD CONSTRAINT `project_timelines_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_timelines` ADD CONSTRAINT `project_timelines_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_stages` ADD CONSTRAINT `project_stages_timeline_id_fkey` FOREIGN KEY (`timeline_id`) REFERENCES `project_timelines`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_stages` ADD CONSTRAINT `project_stages_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_stages` ADD CONSTRAINT `project_stages_completed_by_id_fkey` FOREIGN KEY (`completed_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_stage_media` ADD CONSTRAINT `project_stage_media_stage_id_fkey` FOREIGN KEY (`stage_id`) REFERENCES `project_stages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `voting_periods` ADD CONSTRAINT `voting_periods_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `votes` ADD CONSTRAINT `votes_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `votes` ADD CONSTRAINT `votes_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pledges` ADD CONSTRAINT `pledges_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pledges` ADD CONSTRAINT `pledges_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_pledge_id_fkey` FOREIGN KEY (`pledge_id`) REFERENCES `pledges`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_project_stage_id_fkey` FOREIGN KEY (`project_stage_id`) REFERENCES `project_stages`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_ledger_account_id_fkey` FOREIGN KEY (`ledger_account_id`) REFERENCES `ledger_accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lgas` ADD CONSTRAINT `lgas_state_id_fkey` FOREIGN KEY (`state_id`) REFERENCES `states`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cases` ADD CONSTRAINT `cases_reporter_user_id_fkey` FOREIGN KEY (`reporter_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cases` ADD CONSTRAINT `cases_assignee_user_id_fkey` FOREIGN KEY (`assignee_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cases` ADD CONSTRAINT `cases_reviewer_user_id_fkey` FOREIGN KEY (`reviewer_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cases` ADD CONSTRAINT `cases_state_id_fkey` FOREIGN KEY (`state_id`) REFERENCES `states`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cases` ADD CONSTRAINT `cases_lga_id_fkey` FOREIGN KEY (`lga_id`) REFERENCES `lgas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `case_files` ADD CONSTRAINT `case_files_case_id_fkey` FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `case_files` ADD CONSTRAINT `case_files_uploaded_by_user_id_fkey` FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `case_notes` ADD CONSTRAINT `case_notes_case_id_fkey` FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `case_notes` ADD CONSTRAINT `case_notes_author_user_id_fkey` FOREIGN KEY (`author_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `settings` ADD CONSTRAINT `settings_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `settings` ADD CONSTRAINT `settings_updated_by_id_fkey` FOREIGN KEY (`updated_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `events` ADD CONSTRAINT `events_creator_id_fkey` FOREIGN KEY (`creator_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `events` ADD CONSTRAINT `events_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_actor_user_id_fkey` FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_target_user_id_fkey` FOREIGN KEY (`target_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddCheckConstraint
ALTER TABLE `projects`
    ADD CONSTRAINT `chk_projects_goal_amount_positive` CHECK (`goal_amount` > 0),
    ADD CONSTRAINT `chk_projects_current_amount_nonnegative` CHECK (`current_amount` >= 0),
    ADD CONSTRAINT `chk_projects_current_not_above_goal` CHECK (`current_amount` <= `goal_amount`);

-- AddCheckConstraint
ALTER TABLE `project_timelines`
    ADD CONSTRAINT `chk_project_timelines_version_positive` CHECK (`version` >= 1);

-- AddCheckConstraint
ALTER TABLE `project_stages`
    ADD CONSTRAINT `chk_project_stages_order_positive` CHECK (`stage_order` >= 1),
    ADD CONSTRAINT `chk_project_stages_planned_cost_nonnegative` CHECK (`planned_cost` >= 0),
    ADD CONSTRAINT `chk_project_stages_actual_cost_nonnegative` CHECK (`actual_cost` IS NULL OR `actual_cost` >= 0),
    ADD CONSTRAINT `chk_project_stages_planned_window` CHECK (`planned_end_date` IS NULL OR `planned_start_date` IS NULL OR `planned_end_date` >= `planned_start_date`),
    ADD CONSTRAINT `chk_project_stages_actual_window` CHECK (`actual_end_date` IS NULL OR `actual_start_date` IS NULL OR `actual_end_date` >= `actual_start_date`);

-- AddCheckConstraint
ALTER TABLE `voting_periods`
    ADD CONSTRAINT `chk_voting_periods_window` CHECK (`end_at` >= `start_at`);

-- AddCheckConstraint
ALTER TABLE `pledges`
    ADD CONSTRAINT `chk_pledges_amount_positive` CHECK (`amount` > 0),
    ADD CONSTRAINT `chk_pledges_schedule_valid` CHECK (
        (`pledge_type` = 'ONE_TIME' AND `recurrence_interval` IS NULL AND `payment_day` IS NULL)
        OR
        (`pledge_type` = 'RECURRING' AND `recurrence_interval` IS NOT NULL AND `payment_day` IS NOT NULL)
    );

-- AddCheckConstraint
ALTER TABLE `transactions`
    ADD CONSTRAINT `chk_transactions_amount_positive` CHECK (`amount` > 0);

-- AddCheckConstraint
ALTER TABLE `case_files`
    ADD CONSTRAINT `chk_case_files_file_size_positive` CHECK (`file_size` > 0);

-- AddCheckConstraint
ALTER TABLE `settings`
    ADD CONSTRAINT `chk_settings_cache_ttl_nonnegative` CHECK (`cache_ttl_seconds` >= 0);

-- AddCheckConstraint
ALTER TABLE `events`
    ADD CONSTRAINT `chk_events_window` CHECK (`end_at` IS NULL OR `end_at` >= `start_at`);

-- CreateView
CREATE VIEW `transaction_ledger_view` AS
SELECT
    t.id,
    t.user_id,
    u.email AS user_email,
    CONCAT(COALESCE(u.first_name, ''), CASE WHEN u.last_name IS NULL OR u.last_name = '' THEN '' ELSE ' ' END, COALESCE(u.last_name, '')) AS user_name,
    t.pledge_id,
    t.project_id,
    p.slug AS project_slug,
    p.title AS project_title,
    t.project_stage_id,
    ps.title AS project_stage_title,
    t.ledger_account_id,
    la.code AS ledger_account_code,
    COALESCE(la.public_name, la.name) AS ledger_account_name,
    la.category AS ledger_account_category,
    t.direction,
    t.kind,
    t.amount,
    t.currency,
    t.status,
    t.payment_method,
    t.payment_processor,
    t.payment_reference,
    t.external_reference,
    t.description,
    t.metadata,
    t.paid_at,
    t.posted_at,
    t.created_at,
    t.updated_at
FROM `transactions` t
LEFT JOIN `users` u ON u.id = t.user_id
LEFT JOIN `projects` p ON p.id = t.project_id
LEFT JOIN `project_stages` ps ON ps.id = t.project_stage_id
LEFT JOIN `ledger_accounts` la ON la.id = t.ledger_account_id;

-- CreateView
CREATE VIEW `project_public_metrics_view` AS
SELECT
    p.id,
    p.slug,
    p.title,
    p.status,
    p.goal_amount,
    p.current_amount,
    p.currency,
    p.country,
    p.state,
    p.sector,
    p.cover_image_url,
    (
        SELECT COUNT(*)
        FROM `project_stages` ps
        INNER JOIN `project_timelines` pt ON pt.id = ps.timeline_id
        WHERE pt.project_id = p.id
          AND ps.status = 'COMPLETED'
    ) AS completed_stage_count,
    (
        SELECT COUNT(*)
        FROM `project_stages` ps
        INNER JOIN `project_timelines` pt ON pt.id = ps.timeline_id
        WHERE pt.project_id = p.id
    ) AS total_stage_count,
    (
        SELECT COUNT(*)
        FROM `votes` v
        WHERE v.project_id = p.id
          AND v.choice = 'SUPPORT'
    ) AS support_vote_count,
    (
        SELECT COUNT(*)
        FROM `votes` v
        WHERE v.project_id = p.id
          AND v.choice = 'OPPOSE'
    ) AS oppose_vote_count,
    (
        SELECT COUNT(*)
        FROM `pledges` pl
        WHERE pl.project_id = p.id
          AND pl.status IN ('ACTIVE', 'COMPLETED')
    ) AS active_or_completed_pledge_count,
    (
        SELECT COALESCE(SUM(t.amount), 0)
        FROM `transactions` t
        WHERE t.project_id = p.id
          AND t.status = 'COMPLETED'
          AND t.direction = 'CREDIT'
    ) AS lifetime_credit_amount
FROM `projects` p
