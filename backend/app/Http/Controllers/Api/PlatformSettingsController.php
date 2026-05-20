<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PlatformSetting;
use App\Support\BrandingHelper;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PlatformSettingsController extends Controller
{
    public function show(): JsonResponse
    {
        $row = PlatformSetting::singleton();

        return response()->json([
            'data' => $this->present($row),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'platform_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'support_email' => ['sometimes', 'nullable', 'email', 'max:255'],
            'default_trial_days' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:365'],
            'maintenance_message' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ]);

        $row = PlatformSetting::singleton();
        $merged = array_merge($row->data ?? [], $data);
        $row->update(['data' => $merged]);

        return response()->json([
            'data' => $this->present($row->fresh()),
        ]);
    }

    protected function present(PlatformSetting $row): array
    {
        $data = $row->data ?? [];

        return array_merge($data, [
            'logo_url' => BrandingHelper::platformLogoUrl($row),
        ]);
    }
}
