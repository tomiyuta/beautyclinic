-- AlterTable: Add new fields to generatedContents
-- Note: MySQL 8.0.19+ supports IF NOT EXISTS for ADD COLUMN
-- For older versions, these will fail gracefully if columns already exist

ALTER TABLE `generatedContents` ADD COLUMN IF NOT EXISTS `fileUrl` VARCHAR(500) NULL;
ALTER TABLE `generatedContents` ADD COLUMN IF NOT EXISTS `fileSize` INT NULL;
ALTER TABLE `generatedContents` ADD COLUMN IF NOT EXISTS `mimeType` VARCHAR(100) NULL;
ALTER TABLE `generatedContents` ADD COLUMN IF NOT EXISTS `complianceStatus` VARCHAR(20) NULL;
ALTER TABLE `generatedContents` ADD COLUMN IF NOT EXISTS `complianceReport` TEXT NULL;
ALTER TABLE `generatedContents` ADD COLUMN IF NOT EXISTS `templateId` INT NULL;
ALTER TABLE `generatedContents` ADD COLUMN IF NOT EXISTS `variations` TEXT NULL;

-- AlterTable: Modify ContentType enum
-- MySQL requires ALTER TABLE to modify ENUM values
-- This needs to be done carefully to avoid data loss
-- Note: This will fail if there are existing rows with incompatible values
ALTER TABLE `generatedContents` MODIFY COLUMN `contentType` ENUM(
  'instagram_lp',
  'website_article',
  'campaign_copy',
  'instagram_post_text',
  'instagram_post_image',
  'instagram_story',
  'ad_banner',
  'lp_visual',
  'instagram_reels',
  'tiktok_video',
  'youtube_shorts',
  'treatment_explanation_video',
  'pre_care_video',
  'post_care_video',
  'faq_video'
) NOT NULL;

-- CreateTable: contentTemplates
CREATE TABLE IF NOT EXISTS `contentTemplates` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `contentType` ENUM(
      'instagram_lp',
      'website_article',
      'campaign_copy',
      'instagram_post_text',
      'instagram_post_image',
      'instagram_story',
      'ad_banner',
      'lp_visual',
      'instagram_reels',
      'tiktok_video',
      'youtube_shorts',
      'treatment_explanation_video',
      'pre_care_video',
      'post_care_video',
      'faq_video'
    ) NOT NULL,
    `settings` TEXT NOT NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: complianceCheckLogs
CREATE TABLE IF NOT EXISTS `complianceCheckLogs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `contentId` INTEGER NOT NULL,
    `checkType` VARCHAR(20) NOT NULL,
    `violations` TEXT NULL,
    `warnings` TEXT NULL,
    `status` VARCHAR(20) NOT NULL,
    `checkedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;


