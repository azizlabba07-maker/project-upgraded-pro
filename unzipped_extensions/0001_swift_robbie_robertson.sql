CREATE TABLE `batch_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`batchName` varchar(255) NOT NULL,
	`totalFiles` int NOT NULL,
	`processedFiles` int DEFAULT 0,
	`failedFiles` int DEFAULT 0,
	`status` enum('pending','processing','completed','failed','paused') NOT NULL DEFAULT 'pending',
	`fileIds` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`completedAt` timestamp,
	CONSTRAINT `batch_jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `generated_metadata` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fileId` int NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`keywords` text NOT NULL,
	`keywordCount` int DEFAULT 0,
	`language` varchar(10) NOT NULL DEFAULT 'en',
	`aiModel` varchar(50) NOT NULL DEFAULT 'gpt-4-vision',
	`processingTime` int,
	`isApproved` boolean DEFAULT false,
	`approvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `generated_metadata_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `keyword_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`category` varchar(100) NOT NULL,
	`subcategory` varchar(100),
	`keywords` text NOT NULL,
	`language` varchar(10) NOT NULL DEFAULT 'en',
	`description` text,
	`usageCount` int DEFAULT 0,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `keyword_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `processing_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`fileId` int,
	`metadataId` int,
	`actionType` varchar(50) NOT NULL,
	`actionDetails` text,
	`ipAddress` varchar(45),
	`userAgent` text,
	`simulatedDelay` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `processing_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `uploaded_files` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileType` varchar(50) NOT NULL,
	`mimeType` varchar(100) NOT NULL,
	`fileSize` int NOT NULL,
	`s3Key` varchar(500) NOT NULL,
	`s3Url` text NOT NULL,
	`thumbnailUrl` text,
	`processingStatus` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `uploaded_files_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`preferredLanguage` varchar(10) NOT NULL DEFAULT 'en',
	`enableHumanSimulation` boolean DEFAULT true,
	`delayBetweenActions` int DEFAULT 2000,
	`randomDelayVariation` int DEFAULT 1000,
	`maxFilesPerBatch` int DEFAULT 10,
	`autoApproveMetadata` boolean DEFAULT false,
	`notificationsEnabled` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_preferences_userId_unique` UNIQUE(`userId`)
);
