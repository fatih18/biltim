/** A finding as the audit form's lists read it: the columns the panel and its detail modal show. */
export type FiveSFindingLite = {
  id: string
  finding_no?: number | null
  question_id?: string | null
  step_code?: string | null
  detected_date?: string
  location_name?: string
  finding_type?: string
  status?: string
  description?: string | null
  action_to_take?: string | null
  due_date?: string | null
  responsible_name?: string | null

  photo_before_url?: string | null
  photo_before_file_id?: string | null
  photo_before_files?: Array<{ file_id: string | null; url: string | null }> | null
}
