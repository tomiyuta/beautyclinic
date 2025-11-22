-- AlterTable: Add new fields to generatedContents
ALTER TABLE `generatedContents` ADD COLUMN IF NOT EXISTS `fileUrl` VARCHAR(500) NULL;
ALTER TABLE `generatedContents` ADD COLUMN IF NOT EXISTS `fileSize` INT NULL;
ALTER TABLE `generatedContents` ADD COLUMN IF NOT EXISTS `mimeType` VARCHAR(100) NULL;
ALTER TABLE `generatedContents` ADD COLUMN IF NOT EXISTS `complianceStatus` VARCHAR(20) NULL;
ALTER TABLE `generatedContents` ADD COLUMN IF NOT EXISTS `complianceReport` TEXT NULL;
ALTER TABLE `generatedContents` ADD COLUMN IF NOT EXISTS `templateId` INT NULL;
ALTER TABLE `generatedContents` ADD COLUMN IF NOT EXISTS `variations` TEXT NULL;

