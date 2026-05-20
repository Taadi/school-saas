<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\School\RegisterSchoolRequest;
use App\Models\AcademicSession;
use App\Models\AssessmentComponent;
use App\Models\AssessmentScheme;
use App\Models\FeeCategory;
use App\Models\GradingBand;
use App\Models\GradingScale;
use App\Models\ReportSetting;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\Term;
use App\Models\User;
use App\Services\ReportSettingsService;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SchoolRegistrationController extends Controller
{
    public function __construct(protected TenantContext $tenantContext) {}

    /**
     * Onboard a new school: create the tenant record, the first school admin,
     * and seed the standard Nigerian class structure + core subjects.
     */
    public function register(RegisterSchoolRequest $request): JsonResponse
    {
        $payload = $request->validated();

        $result = DB::transaction(function () use ($payload) {
            $school = School::create([
                'name' => $payload['school']['name'],
                'slug' => $this->uniqueSlug($payload['school']['name']),
                'email' => $payload['school']['email'],
                'phone' => $payload['school']['phone'] ?? null,
                'address' => $payload['school']['address'] ?? null,
                'city' => $payload['school']['city'] ?? null,
                'state' => $payload['school']['state'] ?? null,
                'motto' => $payload['school']['motto'] ?? null,
                'subscription_status' => 'trial',
                'subscription_expires_at' => now()->addDays(30),
            ]);

            // Bind the new tenant so global scopes stamp tenant_id automatically
            // for the seeded resources below.
            $this->tenantContext->set($school->id);

            $admin = User::create([
                'tenant_id' => $school->id,
                'name' => $payload['admin']['name'],
                'email' => $payload['admin']['email'],
                'phone' => $payload['admin']['phone'] ?? null,
                'password' => $payload['admin']['password'],
                'role' => User::ROLE_SCHOOL_ADMIN,
            ]);

            $this->seedDefaultClasses($school->id);
            $this->seedDefaultSubjects($school->id);
            $this->seedDefaultSession($school->id);
            $this->mapDefaultClassSubjects($school->id);
            $this->seedDefaultFeeCategories($school->id);
            $this->seedDefaultReportConfig($school->id);

            return ['school' => $school, 'admin' => $admin];
        });

        $this->tenantContext->clear();

        $token = $result['admin']->createToken('api', [$result['admin']->role])->plainTextToken;

        return response()->json([
            'message' => 'School registered successfully.',
            'school' => $result['school']->only(['id', 'name', 'slug', 'email', 'subscription_status', 'subscription_expires_at']),
            'admin' => $result['admin']->only(['id', 'name', 'email', 'role']),
            'token' => $token,
        ], 201);
    }

    protected function uniqueSlug(string $name): string
    {
        $base = Str::slug($name);
        $slug = $base;
        $i = 1;

        while (School::where('slug', $slug)->exists()) {
            $slug = $base.'-'.$i++;
        }

        return $slug;
    }

    /**
     * Standard Nigerian school structure: Primary 1-6, JSS1-3, SSS1-3.
     */
    protected function seedDefaultClasses(int $tenantId): void
    {
        $classes = [
            ['name' => 'Primary 1', 'level' => 'primary', 'order' => 1],
            ['name' => 'Primary 2', 'level' => 'primary', 'order' => 2],
            ['name' => 'Primary 3', 'level' => 'primary', 'order' => 3],
            ['name' => 'Primary 4', 'level' => 'primary', 'order' => 4],
            ['name' => 'Primary 5', 'level' => 'primary', 'order' => 5],
            ['name' => 'Primary 6', 'level' => 'primary', 'order' => 6],
            ['name' => 'JSS1', 'level' => 'junior_secondary', 'order' => 7],
            ['name' => 'JSS2', 'level' => 'junior_secondary', 'order' => 8],
            ['name' => 'JSS3', 'level' => 'junior_secondary', 'order' => 9],
            ['name' => 'SSS1', 'level' => 'senior_secondary', 'order' => 10],
            ['name' => 'SSS2', 'level' => 'senior_secondary', 'order' => 11],
            ['name' => 'SSS3', 'level' => 'senior_secondary', 'order' => 12],
        ];

        foreach ($classes as $class) {
            SchoolClass::create($class + ['tenant_id' => $tenantId]);
        }
    }

    /**
     * Common Nigerian curriculum subjects.
     */
    protected function seedDefaultSubjects(int $tenantId): void
    {
        $subjects = [
            ['code' => 'ENG', 'name' => 'English Language'],
            ['code' => 'MTH', 'name' => 'Mathematics'],
            ['code' => 'BSC', 'name' => 'Basic Science'],
            ['code' => 'BTC', 'name' => 'Basic Technology'],
            ['code' => 'SOS', 'name' => 'Social Studies'],
            ['code' => 'CRS', 'name' => 'Christian Religious Studies'],
            ['code' => 'IRS', 'name' => 'Islamic Religious Studies'],
            ['code' => 'CIV', 'name' => 'Civic Education'],
            ['code' => 'AGS', 'name' => 'Agricultural Science'],
            ['code' => 'PHY', 'name' => 'Physics'],
            ['code' => 'CHM', 'name' => 'Chemistry'],
            ['code' => 'BIO', 'name' => 'Biology'],
            ['code' => 'GOV', 'name' => 'Government'],
            ['code' => 'ECO', 'name' => 'Economics'],
            ['code' => 'LIT', 'name' => 'Literature in English'],
        ];

        foreach ($subjects as $subject) {
            Subject::create($subject + ['tenant_id' => $tenantId]);
        }
    }

    /**
     * Seed the current Nigerian academic session (Sep–Aug) plus three terms.
     */
    protected function seedDefaultSession(int $tenantId): void
    {
        $year = (int) now()->year;
        $month = (int) now()->month;
        $startYear = $month >= 9 ? $year : $year - 1;
        $name = $startYear.'/'.($startYear + 1);

        $session = AcademicSession::create([
            'tenant_id' => $tenantId,
            'name' => $name,
            'start_date' => now()->setDate($startYear, 9, 1)->toDateString(),
            'end_date' => now()->setDate($startYear + 1, 7, 31)->toDateString(),
            'is_current' => true,
            'status' => 'active',
        ]);

        $terms = [
            ['name' => 'first',  'start' => [$startYear, 9, 1],   'end' => [$startYear, 12, 15]],
            ['name' => 'second', 'start' => [$startYear + 1, 1, 8], 'end' => [$startYear + 1, 4, 15]],
            ['name' => 'third',  'start' => [$startYear + 1, 4, 22], 'end' => [$startYear + 1, 7, 31]],
        ];

        foreach ($terms as $i => $term) {
            Term::create([
                'tenant_id' => $tenantId,
                'academic_session_id' => $session->id,
                'name' => $term['name'],
                'start_date' => now()->setDate(...$term['start'])->toDateString(),
                'end_date' => now()->setDate(...$term['end'])->toDateString(),
                'is_current' => $i === 0,
            ]);
        }
    }

    /**
     * Default subject-per-class mapping for Nigerian curriculum.
     * Senior secondary (SSS) gets the science track by default — admins can
     * switch to commercial/arts via the Classes admin page.
     */
    protected function mapDefaultClassSubjects(int $tenantId): void
    {
        $classes = SchoolClass::where('tenant_id', $tenantId)->get()->keyBy('name');
        $subjects = Subject::where('tenant_id', $tenantId)->get()->keyBy('code');

        $primary = ['ENG', 'MTH', 'BSC', 'SOS', 'CIV', 'CRS'];
        $junior = ['ENG', 'MTH', 'BSC', 'BTC', 'SOS', 'CIV', 'CRS', 'AGS'];
        $senior = ['ENG', 'MTH', 'PHY', 'CHM', 'BIO', 'CIV', 'GOV', 'ECO', 'LIT'];

        $mapping = [
            'Primary 1' => $primary, 'Primary 2' => $primary, 'Primary 3' => $primary,
            'Primary 4' => $primary, 'Primary 5' => $primary, 'Primary 6' => $primary,
            'JSS1' => $junior, 'JSS2' => $junior, 'JSS3' => $junior,
            'SSS1' => $senior, 'SSS2' => $senior, 'SSS3' => $senior,
        ];

        foreach ($mapping as $className => $codes) {
            $class = $classes[$className] ?? null;
            if (! $class) continue;

            $subjectIds = collect($codes)
                ->map(fn ($c) => $subjects[$c] ?? null)
                ->filter()
                ->mapWithKeys(fn ($s) => [
                    $s->id => ['tenant_id' => $tenantId, 'is_compulsory' => true],
                ])
                ->all();

            $class->subjects()->syncWithoutDetaching($subjectIds);
        }
    }

    /**
     * Common Nigerian school fee categories. Schools can extend or rename
     * these from the Fee Categories admin page.
     */
    protected function seedDefaultFeeCategories(int $tenantId): void
    {
        $categories = [
            ['code' => 'TUITION',     'name' => 'School Fees',       'description' => 'Termly tuition fees'],
            ['code' => 'PTA',         'name' => 'PTA Levy',          'description' => 'Parent-Teacher Association dues'],
            ['code' => 'UNIFORM',     'name' => 'Uniform',           'description' => 'School uniform & sportswear'],
            ['code' => 'BOOKS',       'name' => 'Textbooks',         'description' => 'Termly textbooks and stationery'],
            ['code' => 'EXAM',        'name' => 'Exam Fees',         'description' => 'External / internal exam fees'],
            ['code' => 'DEVELOPMENT', 'name' => 'Development Levy',  'description' => 'School development fund'],
            ['code' => 'TRANSPORT',   'name' => 'Transportation',    'description' => 'School bus / transport fees'],
            ['code' => 'FEEDING',     'name' => 'Feeding',           'description' => 'Lunch / boarding feeding fees'],
        ];

        foreach ($categories as $category) {
            FeeCategory::create($category + [
                'tenant_id' => $tenantId,
                'is_active' => true,
            ]);
        }
    }

    /**
     * Seed the default Nigerian grading scale, the standard CA + Exam
     * assessment scheme and a baseline `report_settings` row so the College
     * Report module is usable on day one without admin intervention.
     */
    protected function seedDefaultReportConfig(int $tenantId): void
    {
        $scale = GradingScale::create([
            'tenant_id' => $tenantId,
            'name' => 'Default Nigerian Scale',
            'description' => 'Auto-seeded WAEC-style grading.',
            'is_default' => true,
        ]);
        $bands = [
            ['min' => 70, 'max' => 100, 'grade' => 'A', 'point' => 5, 'remark' => 'Excellent'],
            ['min' => 60, 'max' => 69.99, 'grade' => 'B', 'point' => 4, 'remark' => 'Very Good'],
            ['min' => 50, 'max' => 59.99, 'grade' => 'C', 'point' => 3, 'remark' => 'Good'],
            ['min' => 45, 'max' => 49.99, 'grade' => 'D', 'point' => 2, 'remark' => 'Pass'],
            ['min' => 40, 'max' => 44.99, 'grade' => 'E', 'point' => 1, 'remark' => 'Fair'],
            ['min' => 0,  'max' => 39.99, 'grade' => 'F', 'point' => 0, 'remark' => 'Fail'],
        ];
        foreach ($bands as $i => $b) {
            GradingBand::create([
                'tenant_id' => $tenantId,
                'grading_scale_id' => $scale->id,
                'min_score' => $b['min'],
                'max_score' => $b['max'],
                'grade' => $b['grade'],
                'grade_point' => $b['point'],
                'remark' => $b['remark'],
                'sort_order' => $i,
            ]);
        }

        $scheme = AssessmentScheme::create([
            'tenant_id' => $tenantId,
            'name' => 'Standard CA + Exam',
            'description' => 'CA1 + CA2 + Mid-term + Exam = 100',
            'grading_scale_id' => $scale->id,
            'total_max' => 100,
            'is_default' => true,
            'is_active' => true,
        ]);
        $components = [
            ['code' => 'ca1', 'label' => 'CA 1', 'max' => 10, 'is_exam' => false],
            ['code' => 'ca2', 'label' => 'CA 2', 'max' => 10, 'is_exam' => false],
            ['code' => 'midterm', 'label' => 'Mid-term', 'max' => 10, 'is_exam' => false],
            ['code' => 'exam', 'label' => 'Exam', 'max' => 70, 'is_exam' => true],
        ];
        foreach ($components as $i => $c) {
            AssessmentComponent::create([
                'tenant_id' => $tenantId,
                'assessment_scheme_id' => $scheme->id,
                'code' => $c['code'],
                'label' => $c['label'],
                'max_score' => $c['max'],
                'weight' => 1,
                'is_exam' => $c['is_exam'],
                'sort_order' => $i,
            ]);
        }

        ReportSetting::create([
            'tenant_id' => $tenantId,
            'data' => app(ReportSettingsService::class)->defaults(),
        ]);
    }
}
