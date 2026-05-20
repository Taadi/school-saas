import { api } from '@/lib/api';

export type PromotionAction = 'promote' | 'repeat' | 'graduate';

export interface PromotionPreviewStudent {
  id: number;
  admission_number: string;
  name: string;
  already_enrolled_in_target: boolean;
}

export interface PromotionPreviewGroup {
  source_class_id: number;
  source_class_name: string | null;
  source_arm_id: number | null;
  source_arm_name: string | null;
  student_count: number;
  suggested_target_class_id: number | null;
  suggested_target_class_name: string | null;
  suggested_action: PromotionAction;
  students: PromotionPreviewStudent[];
}

export interface PromotionPreviewContext {
  source_session: { id: number; name: string };
  target_session: { id: number; name: string };
  classes: {
    id: number;
    name: string;
    level: string;
    arms: { id: number; name: string }[];
  }[];
}

export interface PromotionRule {
  source_class_id: number;
  source_arm_id: number | null;
  action: PromotionAction;
  target_class_id?: number | null;
  target_arm_id?: number | null;
  exclude_student_ids?: number[];
}

export interface PromotionSummary {
  promoted: number;
  repeated: number;
  graduated: number;
  skipped_already_enrolled: number;
  errors: string[];
}

export const promotionsApi = {
  preview(
    sourceSessionId: number,
    targetSessionId: number,
  ): Promise<{
    data: PromotionPreviewGroup[];
    context: PromotionPreviewContext;
  }> {
    return api.get('/promotions/preview', {
      source_session_id: sourceSessionId,
      target_session_id: targetSessionId,
    });
  },

  apply(payload: {
    source_session_id: number;
    target_session_id: number;
    rules: PromotionRule[];
  }): Promise<{ message: string; summary: PromotionSummary }> {
    return api.post('/promotions/apply', payload);
  },
};
