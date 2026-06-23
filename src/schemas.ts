import { z } from "zod";

// =============================================================================
// Value Schemas
// =============================================================================

export const AssistanceListingValueSchema = z.object({
  identifier: z.string().nullish(),
  programTitle: z.string().nullish(),
});

export const AgencyValueSchema = z.object({
  code: z.string().nullish(),
  name: z.string().nullish(),
  parentName: z.string().nullish(),
  parentCode: z.string().nullish(),
});

export const AttachmentValueSchema = z.object({
  downloadUrl: z.string().nullish(),
  name: z.string(),
  description: z.string().nullish(),
  sizeInBytes: z.number().int().nullish(),
  mimeType: z.string().nullish(),
  createdAt: z.string().datetime(),
  lastModifiedAt: z.string().datetime(),
});

export const ContactInfoValueSchema = z.object({
  name: z.string().nullish(),
  email: z.string().nullish(),
  emailDescription: z.string().nullish(),
  phone: z.string().nullish(),
  description: z.string().nullish(),
});

export const AdditionalInfoValueSchema = z.object({
  url: z.string().nullish(),
  description: z.string().nullish(),
});

export const CostSharingValueSchema = z.object({
  isRequired: z.boolean().nullish(),
});

// =============================================================================
// Source Schema (Simpler.Grants.gov GET /v1/opportunities/:id response data)
// =============================================================================

export const AssistanceListingSourceSchema = z.object({
  assistance_listing_number: z.string().nullish(),
  program_title: z.string().nullish(),
});

export const OpportunitySummarySourceSchema = z.object({
  summary_description: z.string().nullish(),
  is_cost_sharing: z.boolean().nullish(),
  is_forecast: z.boolean(),
  close_date: z.string().nullish(),
  post_date: z.string().nullish(),
  expected_number_of_awards: z.number().int().nullish(),
  estimated_total_program_funding: z.number().int().nullish(),
  award_floor: z.number().int().nullish(),
  award_ceiling: z.number().int().nullish(),
  additional_info_url: z.string().nullish(),
  additional_info_url_description: z.string().nullish(),
  forecasted_post_date: z.string().nullish(),
  forecasted_close_date: z.string().nullish(),
  fiscal_year: z.number().int().nullish(),
  agency_contact_description: z.string().nullish(),
  agency_email_address: z.string().nullish(),
  agency_email_address_description: z.string().nullish(),
  funding_instruments: z.array(z.string()).default([]),
  funding_categories: z.array(z.string()).default([]),
  applicant_types: z.array(z.string()).default([]),
  created_at: z.string().datetime({ offset: true, precision: 6 }),
  updated_at: z.string().datetime({ offset: true, precision: 6 }),
});

export const OpportunityAttachmentSourceSchema = z.object({
  opportunity_attachment_id: z.string().uuid().nullish(),
  mime_type: z.string().nullish(),
  file_name: z.string().nullish(),
  file_description: z.string().nullish(),
  download_url: z.string().nullish(),
  created_at: z.string().datetime().nullish(),
  updated_at: z.string().datetime().nullish(),
});

export const GrantsGovOpportunitySchema = z.object({
  opportunity_id: z.string().uuid(),
  legacy_opportunity_id: z.number().int().nullish(),
  opportunity_number: z.string().nullish(),
  opportunity_title: z.string().nullish(),
  agency_code: z.string().nullish(),
  agency_name: z.string().nullish(),
  top_level_agency_name: z.string().nullish(),
  top_level_agency_code: z.string().nullish(),
  category: z.string().nullish(),
  opportunity_assistance_listings: z.array(AssistanceListingSourceSchema).default([]),
  summary: OpportunitySummarySourceSchema.nullish(),
  opportunity_status: z.enum(["forecasted", "posted", "closed", "archived"]),
  attachments: z.array(OpportunityAttachmentSourceSchema).nullish(),
  created_at: z.string().datetime({ offset: true, precision: 6 }),
  updated_at: z.string().datetime({ offset: true, precision: 6 }),
});

export type GrantsGovOpportunity = z.infer<typeof GrantsGovOpportunitySchema>;
