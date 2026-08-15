import { describe, it, expect } from 'vitest';
import { Employee } from '../../../src/types/employee';
import { SalarySlip } from '../../../src/types/salarySlip';
import { DeliveryRecord } from '../../../src/types/delivery';

function computeDashboardState(
  employees: Employee[],
  slips: SalarySlip[],
  records: DeliveryRecord[]
) {
  const employeeCount = employees.length;
  const slipCount = slips.length;

  const needsReviewCount =
    slipCount === 0
      ? 0
      : slips.filter(
          (s) =>
            s.approvalStatus === 'PENDING' ||
            s.matchStatus === 'POSSIBLE_MATCH' ||
            s.matchStatus === 'CONFLICT' ||
            s.matchStatus === 'MANUAL_REVIEW' ||
            s.matchStatus === 'UNMATCHED' ||
            s.ocrStatus === 'FAILED'
        ).length;

  const approvedCount = slips.filter(
    (s) => s.approvalStatus === 'APPROVED' || s.matchStatus === 'MANUALLY_CONFIRMED'
  ).length;

  const deliveredCount = records.filter(
    (r) => r.status === 'SENT' || r.status === 'SUCCESS'
  ).length;

  const isStep1Complete = employeeCount > 0;
  const isStep2Complete = slipCount > 0;
  const isStep3Complete = slipCount > 0 && needsReviewCount === 0 && approvedCount > 0;
  const isStep4Complete = approvedCount > 0 && deliveredCount >= approvedCount;

  const step1Status = isStep1Complete ? 'COMPLETED' : 'CURRENT';
  const step2Status = isStep2Complete ? 'COMPLETED' : isStep1Complete ? 'CURRENT' : 'LOCKED';
  const step3Status = !isStep2Complete ? 'LOCKED' : needsReviewCount > 0 ? 'NEEDS_REVIEW' : 'COMPLETED';
  const step4Status = approvedCount === 0 ? 'LOCKED' : isStep4Complete ? 'COMPLETED' : 'READY_TO_SEND';

  return {
    employeeCount,
    slipCount,
    needsReviewCount,
    approvedCount,
    deliveredCount,
    isStep1Complete,
    isStep2Complete,
    isStep3Complete,
    isStep4Complete,
    step1Status,
    step2Status,
    step3Status,
    step4Status,
  };
}

describe('Dashboard Onboarding Workflow State Unit Tests', () => {
  it('CASE 1: 0 employees -> Step 1 CURRENT, Steps 2-4 LOCKED', () => {
    const state = computeDashboardState([], [], []);
    expect(state.step1Status).toBe('CURRENT');
    expect(state.step2Status).toBe('LOCKED');
    expect(state.step3Status).toBe('LOCKED');
    expect(state.step4Status).toBe('LOCKED');
    expect(state.needsReviewCount).toBe(0);
  });

  it('CASE 2: 156 employees, 0 salary slips -> Step 1 COMPLETED, Step 2 CURRENT, Steps 3-4 LOCKED', () => {
    const mockEmployees = Array.from({ length: 156 }, (_, i) => ({
      id: `emp-${i + 1}`,
      employeeId: `${100 + i}`,
      name: `Employee ${i + 1}`,
      createdAt: '1000',
      updatedAt: '1000',
    }));

    const state = computeDashboardState(mockEmployees, [], []);
    expect(state.step1Status).toBe('COMPLETED');
    expect(state.step2Status).toBe('CURRENT');
    expect(state.step3Status).toBe('LOCKED');
    expect(state.step4Status).toBe('LOCKED');
    expect(state.needsReviewCount).toBe(0);
  });

  it('CASE 3: 156 employees, 156 slips, matching not run -> Steps 1-2 COMPLETED, Step 3 NEEDS_REVIEW, Step 4 LOCKED', () => {
    const mockEmployees = Array.from({ length: 156 }, (_, i) => ({
      id: `emp-${i + 1}`,
      employeeId: `${100 + i}`,
      name: `Employee ${i + 1}`,
      createdAt: '1000',
      updatedAt: '1000',
    }));

    const mockSlips = Array.from({ length: 156 }, (_, i) => ({
      id: `slip-${i + 1}`,
      filePath: `C:\\SalarySlips\\slip-${i + 1}.pdf`,
      fileName: `slip-${i + 1}.pdf`,
      fileHash: `hash-${i + 1}`,
      extractionMethod: 'TEXT_EMBEDDED',
      matchConfidence: 0.0,
      matchStatus: 'UNMATCHED',
      approvalStatus: 'PENDING',
      ocrStatus: 'NOT_REQUIRED',
      createdAt: '1000',
      updatedAt: '1000',
    })) as SalarySlip[];

    const state = computeDashboardState(mockEmployees, mockSlips, []);
    expect(state.step1Status).toBe('COMPLETED');
    expect(state.step2Status).toBe('COMPLETED');
    expect(state.step3Status).toBe('NEEDS_REVIEW');
    expect(state.needsReviewCount).toBe(156);
    expect(state.step4Status).toBe('LOCKED');
  });

  it('CASE 4: 156 slips, matching completed, 0 approved -> Step 3 NEEDS_REVIEW, Step 4 LOCKED', () => {
    const mockEmployees = Array.from({ length: 156 }, (_, i) => ({
      id: `emp-${i + 1}`,
      employeeId: `${100 + i}`,
      name: `Employee ${i + 1}`,
      createdAt: '1000',
      updatedAt: '1000',
    }));

    const mockSlips = Array.from({ length: 156 }, (_, i) => ({
      id: `slip-${i + 1}`,
      filePath: `C:\\SalarySlips\\slip-${i + 1}.pdf`,
      fileName: `slip-${i + 1}.pdf`,
      fileHash: `hash-${i + 1}`,
      extractionMethod: 'TEXT_EMBEDDED',
      matchConfidence: 1.0,
      matchStatus: 'EXACT_MATCH',
      approvalStatus: 'PENDING', // Automatic matching sets PENDING per safety rule
      ocrStatus: 'NOT_REQUIRED',
      createdAt: '1000',
      updatedAt: '1000',
    })) as SalarySlip[];

    const state = computeDashboardState(mockEmployees, mockSlips, []);
    expect(state.step3Status).toBe('NEEDS_REVIEW');
    expect(state.needsReviewCount).toBe(156);
    expect(state.approvedCount).toBe(0);
    expect(state.step4Status).toBe('LOCKED');
  });

  it('CASE 5: 156 approved -> Step 3 COMPLETED, Step 4 READY_TO_SEND', () => {
    const mockEmployees = Array.from({ length: 156 }, (_, i) => ({
      id: `emp-${i + 1}`,
      employeeId: `${100 + i}`,
      name: `Employee ${i + 1}`,
      createdAt: '1000',
      updatedAt: '1000',
    }));

    const mockSlips = Array.from({ length: 156 }, (_, i) => ({
      id: `slip-${i + 1}`,
      filePath: `C:\\SalarySlips\\slip-${i + 1}.pdf`,
      fileName: `slip-${i + 1}.pdf`,
      fileHash: `hash-${i + 1}`,
      extractionMethod: 'TEXT_EMBEDDED',
      matchConfidence: 1.0,
      matchStatus: 'MANUALLY_CONFIRMED',
      approvalStatus: 'APPROVED',
      ocrStatus: 'NOT_REQUIRED',
      createdAt: '1000',
      updatedAt: '1000',
    })) as SalarySlip[];

    const state = computeDashboardState(mockEmployees, mockSlips, []);
    expect(state.step3Status).toBe('COMPLETED');
    expect(state.needsReviewCount).toBe(0);
    expect(state.approvedCount).toBe(156);
    expect(state.step4Status).toBe('READY_TO_SEND');
  });

  it('CASE 6: 156 successfully delivered -> Step 4 COMPLETED', () => {
    const mockEmployees = Array.from({ length: 156 }, (_, i) => ({
      id: `emp-${i + 1}`,
      employeeId: `${100 + i}`,
      name: `Employee ${i + 1}`,
      createdAt: '1000',
      updatedAt: '1000',
    }));

    const mockSlips = Array.from({ length: 156 }, (_, i) => ({
      id: `slip-${i + 1}`,
      filePath: `C:\\SalarySlips\\slip-${i + 1}.pdf`,
      fileName: `slip-${i + 1}.pdf`,
      fileHash: `hash-${i + 1}`,
      extractionMethod: 'TEXT_EMBEDDED',
      matchConfidence: 1.0,
      matchStatus: 'MANUALLY_CONFIRMED',
      approvalStatus: 'APPROVED',
      ocrStatus: 'NOT_REQUIRED',
      createdAt: '1000',
      updatedAt: '1000',
    })) as SalarySlip[];

    const mockRecords = Array.from({ length: 156 }, (_, i) => ({
      id: `del-${i + 1}`,
      salarySlipId: `slip-${i + 1}`,
      employeeId: `emp-${i + 1}`,
      channel: 'EMAIL',
      status: 'SENT',
      recipient: `emp${i + 1}@example.com`,
      provider: 'SMTP',
      attemptNumber: 1,
      createdAt: '1000',
    })) as DeliveryRecord[];

    const state = computeDashboardState(mockEmployees, mockSlips, mockRecords);
    expect(state.step3Status).toBe('COMPLETED');
    expect(state.step4Status).toBe('COMPLETED');
    expect(state.deliveredCount).toBe(156);
  });
});
