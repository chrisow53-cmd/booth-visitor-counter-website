export interface CampaignSettings {
  id?: number;
  client_name: string;
  campaign_name: string;
  location: string;
  space_size_sqm: number;
  start_date: string;
  end_date: string;
  is_active?: number;
  session_count?: number;
  created_at?: string;
  updated_at?: string;
}
