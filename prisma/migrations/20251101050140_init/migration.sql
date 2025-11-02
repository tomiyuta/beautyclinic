-- CreateTable
CREATE TABLE `clinicProducts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `category` VARCHAR(100) NULL,
    `costPrice` INTEGER NOT NULL,
    `sellingPrice` INTEGER NOT NULL,
    `description` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `marketResearchResults` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `location` VARCHAR(100) NOT NULL,
    `researchType` ENUM('trend_analysis', 'competitor_analysis', 'price_research') NOT NULL,
    `aiAgent` ENUM('gemini', 'grok', 'claude', 'chatgpt') NOT NULL,
    `rawData` TEXT NOT NULL,
    `processedData` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `snsResearchResults` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `platform` ENUM('twitter', 'instagram', 'youtube') NOT NULL,
    `keywords` TEXT NOT NULL,
    `aiAgent` ENUM('gemini', 'grok', 'claude', 'chatgpt') NOT NULL,
    `trendData` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `strategyRecommendations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `analysisDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `priceRecommendations` TEXT NULL,
    `campaignProposals` TEXT NULL,
    `newTreatmentSuggestions` TEXT NULL,
    `marketingStrategy` TEXT NULL,
    `userFeedback` TEXT NULL,
    `implementationStatus` ENUM('pending', 'in_progress', 'completed') NOT NULL DEFAULT 'pending',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `generatedContents` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `strategyId` INTEGER NOT NULL,
    `contentType` ENUM('instagram_lp', 'website_article', 'campaign_copy') NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `content` TEXT NOT NULL,
    `metadata` TEXT NULL,
    `aiAgent` ENUM('gemini', 'grok', 'claude', 'chatgpt') NOT NULL,
    `status` ENUM('draft', 'approved', 'published') NOT NULL DEFAULT 'draft',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `workflowExecutions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `workflowType` VARCHAR(100) NOT NULL,
    `status` ENUM('running', 'completed', 'failed') NOT NULL,
    `steps` TEXT NOT NULL,
    `results` TEXT NULL,
    `errorMessage` TEXT NULL,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
