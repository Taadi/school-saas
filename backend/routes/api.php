<?php

use App\Http\Controllers\Api\AcademicSessionController;
use App\Http\Controllers\Api\AccountController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\FeeCategoryController;
use App\Http\Controllers\Api\FeeStructureController;
use App\Http\Controllers\Api\InvoiceController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\PlatformAdminController;
use App\Http\Controllers\Api\PlatformSettingsController;
use App\Http\Controllers\Api\EvaluationRubricController;
use App\Http\Controllers\Api\EvaluationResponseController;
use App\Http\Controllers\Api\PromotionController;
use App\Http\Controllers\Api\Reports\SubTermController;
use App\Http\Controllers\Api\Reports\AssessmentSchemeController;
use App\Http\Controllers\Api\Reports\GradingScaleController;
use App\Http\Controllers\Api\Reports\ReportSettingsController;
use App\Http\Controllers\Api\Reports\SubjectGroupController;
use App\Http\Controllers\Api\Reports\TermDeadlineController;
use App\Http\Controllers\Api\ResultController;
use App\Http\Controllers\Api\SchoolClassController;
use App\Http\Controllers\Api\SchoolController;
use App\Http\Controllers\Api\SchoolRegistrationController;
use App\Http\Controllers\Api\StudentController;
use App\Http\Controllers\Api\SubjectController;
use App\Http\Controllers\Api\SubjectTeacherController;
use App\Http\Controllers\Api\TeacherController;
use App\Models\User;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Public routes
|--------------------------------------------------------------------------
*/

Route::post('/schools/register', [SchoolRegistrationController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);

/*
|--------------------------------------------------------------------------
| Authenticated routes (Sanctum + Tenant-scoped)
|--------------------------------------------------------------------------
*/

Route::middleware(['auth:sanctum', 'tenant'])->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    Route::get('/school', [SchoolController::class, 'current']);

    // Role-aware dashboard summary
    Route::get('/dashboard/summary', [DashboardController::class, 'summary']);

    // Account (every role)
    Route::get('/account', [AccountController::class, 'show']);
    Route::put('/account', [AccountController::class, 'update']);
    Route::post('/account/password', [AccountController::class, 'changePassword']);

    // Reference
    Route::get('/states', [StudentController::class, 'states']);

    // Classes
    Route::get('/classes', [SchoolClassController::class, 'index']);
    Route::get('/classes/{schoolClass}', [SchoolClassController::class, 'show']);
    Route::get('/classes/{schoolClass}/arms', [SchoolClassController::class, 'arms']);
    Route::get('/classes/{schoolClass}/subjects', [SchoolClassController::class, 'subjects']);

    // Subjects (read)
    Route::get('/subjects', [SubjectController::class, 'index']);

    // Subject ↔ Teacher assignments (read for everyone authenticated;
    // teachers only see their own — handled inside the controller)
    Route::get('/subject-teachers', [SubjectTeacherController::class, 'index']);
    Route::get('/subjects/{subject}/teachers', [SubjectTeacherController::class, 'forSubject']);

    // Academic Sessions (read)
    Route::get('/academic-sessions', [AcademicSessionController::class, 'index']);

    // Students (read)
    Route::get('/students', [StudentController::class, 'index']);
    Route::get('/students/import-template', [StudentController::class, 'importTemplate']);
    Route::get('/students/{student}', [StudentController::class, 'show']);

    // Teachers (read) — admin/teacher list. Profile pages link from staff directories.
    Route::get('/teachers', [TeacherController::class, 'index']);
    Route::get('/teachers/import-template', [TeacherController::class, 'importTemplate']);
    Route::get('/teachers/{teacher}', [TeacherController::class, 'show']);

    // Results (read) — admin/teacher list, plus report card visible to students/parents too.
    Route::get('/results', [ResultController::class, 'index']);
    Route::get('/students/{student}/report-card', [ResultController::class, 'reportCard']);

    // College Report — read access for all authenticated tenant users
    // (write actions are gated below, in the school_admin/super_admin block).
    Route::get('/college-report/grading-scales', [GradingScaleController::class, 'index']);
    Route::get('/college-report/grading-scales/{scale}', [GradingScaleController::class, 'show']);
    Route::get('/college-report/assessment-schemes', [AssessmentSchemeController::class, 'index']);
    Route::get('/college-report/assessment-schemes/{scheme}', [AssessmentSchemeController::class, 'show']);
    Route::get('/college-report/subject-groups', [SubjectGroupController::class, 'index']);
    Route::get('/college-report/settings', [ReportSettingsController::class, 'show']);
    Route::get('/college-report/sub-terms', [SubTermController::class, 'index']);

    // Evaluations (read)
    Route::get('/evaluations/rubrics', [EvaluationRubricController::class, 'index']);
    Route::get('/evaluations/rubrics/{rubric}', [EvaluationRubricController::class, 'show']);
    Route::get('/evaluations/periods', [EvaluationResponseController::class, 'periods']);
    Route::get('/evaluations/sheet', [EvaluationResponseController::class, 'sheet']);
    Route::get('/students/{student}/evaluations', [EvaluationResponseController::class, 'studentTimeline']);

    // Fees — read scoped per role inside the controller (students/parents see their own).
    Route::get('/fee-categories', [FeeCategoryController::class, 'index']);
    Route::get('/fee-structures', [FeeStructureController::class, 'index']);
    Route::get('/invoices', [InvoiceController::class, 'index']);
    Route::get('/invoices/summary', [InvoiceController::class, 'summary']);
    Route::get('/invoices/{invoice}', [InvoiceController::class, 'show']);
    Route::get('/payments', [PaymentController::class, 'index']);

    /*
    |--------------------------------------------------------------------------
    | Teacher + Admin actions (score entry / submission)
    |--------------------------------------------------------------------------
    */
    Route::middleware('role:'.User::ROLE_TEACHER.','.User::ROLE_SCHOOL_ADMIN.','.User::ROLE_SUPER_ADMIN)->group(function () {
        Route::get('/results/score-sheet', [ResultController::class, 'scoreSheet']);
        Route::post('/results/bulk', [ResultController::class, 'bulkUpsert']);
        Route::post('/results/submit', [ResultController::class, 'submit']);
        Route::post('/evaluations/responses/bulk', [EvaluationResponseController::class, 'bulkUpsert']);
    });

    /*
    |--------------------------------------------------------------------------
    | Admin write actions (school_admin / super_admin)
    |--------------------------------------------------------------------------
    */
    Route::middleware('role:'.User::ROLE_SCHOOL_ADMIN.','.User::ROLE_SUPER_ADMIN)->group(function () {

        // Classes CRUD
        Route::post('/classes', [SchoolClassController::class, 'store']);
        Route::put('/classes/{schoolClass}', [SchoolClassController::class, 'update']);
        Route::patch('/classes/{schoolClass}', [SchoolClassController::class, 'update']);
        Route::delete('/classes/{schoolClass}', [SchoolClassController::class, 'destroy']);

        // Arms CRUD
        Route::post('/classes/{schoolClass}/arms', [SchoolClassController::class, 'storeArm']);
        Route::put('/classes/{schoolClass}/arms/{arm}', [SchoolClassController::class, 'updateArm']);
        Route::delete('/classes/{schoolClass}/arms/{arm}', [SchoolClassController::class, 'destroyArm']);

        // Subjects per class
        Route::put('/classes/{schoolClass}/subjects', [SchoolClassController::class, 'syncSubjects']);

        // Subjects CRUD
        Route::post('/subjects', [SubjectController::class, 'store']);
        Route::put('/subjects/{subject}', [SubjectController::class, 'update']);
        Route::delete('/subjects/{subject}', [SubjectController::class, 'destroy']);

        // Subject ↔ Teacher assignment management
        Route::post('/subject-teachers', [SubjectTeacherController::class, 'store']);
        Route::delete('/subject-teachers/{assignment}', [SubjectTeacherController::class, 'destroy']);
        Route::put('/subjects/{subject}/teachers', [SubjectTeacherController::class, 'syncForSubject']);

        // Academic Sessions CRUD
        Route::post('/academic-sessions', [AcademicSessionController::class, 'store']);
        Route::put('/academic-sessions/{session}', [AcademicSessionController::class, 'update']);
        Route::delete('/academic-sessions/{session}', [AcademicSessionController::class, 'destroy']);
        Route::post('/academic-sessions/{session}/set-current', [AcademicSessionController::class, 'setCurrent']);
        Route::post('/academic-sessions/{session}/promote-enrollments', [AcademicSessionController::class, 'promoteEnrollments']);
        Route::put('/academic-sessions/{session}/terms/{term}', [AcademicSessionController::class, 'updateTerm']);

        // Students CRUD
        Route::post('/students', [StudentController::class, 'store']);
        Route::put('/students/{student}', [StudentController::class, 'update']);
        Route::patch('/students/{student}', [StudentController::class, 'update']);
        Route::delete('/students/{student}', [StudentController::class, 'destroy']);
        Route::post('/students/import', [StudentController::class, 'import']);

        // Teachers CRUD + photo upload + password reset + import
        Route::post('/teachers', [TeacherController::class, 'store']);
        Route::put('/teachers/{teacher}', [TeacherController::class, 'update']);
        Route::patch('/teachers/{teacher}', [TeacherController::class, 'update']);
        Route::delete('/teachers/{teacher}', [TeacherController::class, 'destroy']);
        Route::post('/teachers/import', [TeacherController::class, 'import']);
        Route::post('/teachers/{teacher}/photo', [TeacherController::class, 'uploadPhoto']);
        Route::post('/teachers/{teacher}/reset-password', [TeacherController::class, 'resetPassword']);

        // Result approval — sign-off lives with the school admin
        Route::post('/results/approve', [ResultController::class, 'approve']);

        // Promotion Manager — class-by-class promotion + carry-forward
        Route::get('/promotions/preview', [PromotionController::class, 'preview']);
        Route::post('/promotions/apply', [PromotionController::class, 'apply']);

        // College Report — write access (school admin / super admin only)
        Route::post('/college-report/grading-scales', [GradingScaleController::class, 'store']);
        Route::put('/college-report/grading-scales/{scale}', [GradingScaleController::class, 'update']);
        Route::patch('/college-report/grading-scales/{scale}', [GradingScaleController::class, 'update']);
        Route::delete('/college-report/grading-scales/{scale}', [GradingScaleController::class, 'destroy']);
        Route::post('/college-report/grading-scales/{scale}/set-default', [GradingScaleController::class, 'setDefault']);

        Route::post('/college-report/assessment-schemes', [AssessmentSchemeController::class, 'store']);
        Route::put('/college-report/assessment-schemes/{scheme}', [AssessmentSchemeController::class, 'update']);
        Route::patch('/college-report/assessment-schemes/{scheme}', [AssessmentSchemeController::class, 'update']);
        Route::delete('/college-report/assessment-schemes/{scheme}', [AssessmentSchemeController::class, 'destroy']);
        Route::post('/college-report/assessment-schemes/{scheme}/set-default', [AssessmentSchemeController::class, 'setDefault']);

        Route::post('/college-report/subject-groups', [SubjectGroupController::class, 'store']);
        Route::put('/college-report/subject-groups/{group}', [SubjectGroupController::class, 'update']);
        Route::patch('/college-report/subject-groups/{group}', [SubjectGroupController::class, 'update']);
        Route::delete('/college-report/subject-groups/{group}', [SubjectGroupController::class, 'destroy']);

        Route::put('/college-report/settings', [ReportSettingsController::class, 'update']);
        Route::patch('/college-report/settings', [ReportSettingsController::class, 'update']);
        Route::post('/college-report/settings/branding-asset', [ReportSettingsController::class, 'uploadBrandingAsset']);

        Route::patch('/college-report/terms/{term}', [TermDeadlineController::class, 'update']);

        Route::post('/college-report/sub-terms', [SubTermController::class, 'store']);
        Route::put('/college-report/sub-terms/{subTerm}', [SubTermController::class, 'update']);
        Route::delete('/college-report/sub-terms/{subTerm}', [SubTermController::class, 'destroy']);
        Route::post('/college-report/terms/{term}/seed-sub-terms', [SubTermController::class, 'seedDefaults']);

        Route::post('/evaluations/rubrics', [EvaluationRubricController::class, 'store']);
        Route::put('/evaluations/rubrics/{rubric}', [EvaluationRubricController::class, 'update']);
        Route::delete('/evaluations/rubrics/{rubric}', [EvaluationRubricController::class, 'destroy']);
        Route::post('/evaluations/periods/generate', [EvaluationResponseController::class, 'generatePeriods']);

        // Fee categories CRUD
        Route::post('/fee-categories', [FeeCategoryController::class, 'store']);
        Route::put('/fee-categories/{category}', [FeeCategoryController::class, 'update']);
        Route::delete('/fee-categories/{category}', [FeeCategoryController::class, 'destroy']);

        // Fee structures CRUD + bulk matrix
        Route::post('/fee-structures', [FeeStructureController::class, 'store']);
        Route::put('/fee-structures/{structure}', [FeeStructureController::class, 'update']);
        Route::delete('/fee-structures/{structure}', [FeeStructureController::class, 'destroy']);
        Route::post('/fee-structures/bulk-set', [FeeStructureController::class, 'bulkSet']);

        // Invoice generation + line-item edits + delete
        Route::post('/invoices/generate', [InvoiceController::class, 'bulkGenerate']);
        Route::post('/invoices/generate-student', [InvoiceController::class, 'generateForStudent']);
        Route::post('/invoices/{invoice}/items', [InvoiceController::class, 'addItem']);
        Route::delete('/invoices/{invoice}/items/{item}', [InvoiceController::class, 'removeItem']);
        Route::delete('/invoices/{invoice}', [InvoiceController::class, 'destroy']);

        // Payments — admin records and can void.
        Route::post('/payments', [PaymentController::class, 'store']);
        Route::delete('/payments/{payment}', [PaymentController::class, 'destroy']);
    });

    // Super Admin only — platform control plane
    Route::middleware('role:'.User::ROLE_SUPER_ADMIN)->group(function () {
        Route::get('/admin/overview', [PlatformAdminController::class, 'overview']);

        Route::get('/admin/schools', [SchoolController::class, 'index']);
        Route::get('/admin/schools/{school}', [SchoolController::class, 'show']);
        Route::put('/admin/schools/{school}', [SchoolController::class, 'update']);
        Route::patch('/admin/schools/{school}', [SchoolController::class, 'update']);
        Route::post('/admin/schools/{school}/status', [SchoolController::class, 'setStatus']);
        Route::post('/admin/schools/{school}/admins', [SchoolController::class, 'createAdmin']);
        Route::post('/admin/schools/{school}/admins/{user}/reset-password', [SchoolController::class, 'resetAdminPassword']);
        Route::delete('/admin/schools/{school}', [SchoolController::class, 'destroy']);

        Route::get('/admin/platform-settings', [PlatformSettingsController::class, 'show']);
        Route::put('/admin/platform-settings', [PlatformSettingsController::class, 'update']);
    });
});
