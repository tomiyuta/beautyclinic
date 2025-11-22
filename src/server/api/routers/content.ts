import { router } from "../trpc";
import { contentTextRouter } from "./content-text";
import { contentImageRouter } from "./content-image";
import { contentVideoRouter } from "./content-video";
import { contentTemplateRouter } from "./content-template";
import { contentBatchRouter } from "./content-batch";

// 統合されたcontentRouter - 各サブルーターを統合
// 後方互換性のため、既存のエンドポイント名も維持
export const contentRouter = router({
  // サブルーター
  text: contentTextRouter,
  image: contentImageRouter,
  video: contentVideoRouter,
  template: contentTemplateRouter,
  batch: contentBatchRouter,
  
  // 後方互換性のため、既存のエンドポイントも直接公開
  // 各プロシージャを再定義してサブルーターに委譲
  generateInstagramLP: contentTextRouter._def.procedures.generateInstagramLP,
    
  generateWebsiteArticle: contentTextRouter._def.procedures.generateWebsiteArticle,
  generateCampaignCopy: contentTextRouter._def.procedures.generateCampaignCopy,
  generateText: contentTextRouter._def.procedures.generateText,
  generateImage: contentImageRouter._def.procedures.generateImage,
  generateShortVideo: contentVideoRouter._def.procedures.generateShortVideo,
  generateExplanationVideo: contentVideoRouter._def.procedures.generateExplanationVideo,
  checkCompliance: contentTextRouter._def.procedures.checkCompliance,
  listComplianceLogs: contentTextRouter._def.procedures.listComplianceLogs,
  list: contentTextRouter._def.procedures.list,
  getById: contentTextRouter._def.procedures.getById,
  updateStatus: contentTextRouter._def.procedures.updateStatus,
  getCurrentModel: contentTextRouter._def.procedures.getCurrentModel,
  createTemplate: contentTemplateRouter._def.procedures.createTemplate,
  listTemplates: contentTemplateRouter._def.procedures.listTemplates,
  getTemplate: contentTemplateRouter._def.procedures.getTemplate,
  updateTemplate: contentTemplateRouter._def.procedures.updateTemplate,
  deleteTemplate: contentTemplateRouter._def.procedures.deleteTemplate,
  batchGenerate: contentBatchRouter._def.procedures.batchGenerate,
});
