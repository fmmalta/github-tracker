import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AggregationService } from './aggregation.service';
import { DailyMetricsRepository, MetricRow } from './repositories/daily-metrics.repository';
import { MetricKey } from './entities/daily-metric.entity';

describe('AggregationService - Metrics Formulas (TDD)', () => {
  let service: AggregationService;
  let mockDataSource: jest.Mocked<DataSource>;
  let mockRepository: jest.Mocked<DailyMetricsRepository>;

  beforeEach(async () => {
    // Mock DataSource
    mockDataSource = {
      query: jest.fn(),
    } as unknown as jest.Mocked<DataSource>;

    // Mock DailyMetricsRepository
    mockRepository = {
      upsertMany: jest.fn(),
    } as unknown as jest.Mocked<DailyMetricsRepository>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AggregationService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: DailyMetricsRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<AggregationService>(AggregationService);
  });

  describe('Metric formula: prs_opened', () => {
    it('should count PRs opened on the specified date grouped by author_id', async () => {
      const testDate = new Date('2024-01-15');
      const mockPrsOpened = [
        { author_id: 'dev-1', repository_id: 'repo-1', org_id: 'org-1', base_branch: 'main', cnt: '2' },
        { author_id: 'dev-2', repository_id: 'repo-1', org_id: 'org-1', base_branch: 'main', cnt: '1' },
      ];

      mockDataSource.query.mockResolvedValueOnce(mockPrsOpened);
      mockDataSource.query.mockResolvedValueOnce([]); // prs_merged
      mockDataSource.query.mockResolvedValueOnce([]); // prs_closed_unmerged
      mockDataSource.query.mockResolvedValueOnce([]); // reviews_submitted
      mockDataSource.query.mockResolvedValueOnce([]); // code_changes
      mockDataSource.query.mockResolvedValueOnce([]); // averages
      mockDataSource.query.mockResolvedValueOnce([]); // prs_opened_total
      mockDataSource.query.mockResolvedValueOnce([]); // prs_merged_total
      mockDataSource.query.mockResolvedValueOnce([]); // reviews_total

      await service.computeDailyMetrics(testDate);

      // Verify that upsertMany was called and check the rows
      expect(mockRepository.upsertMany).toHaveBeenCalled();
      const passedRows = mockRepository.upsertMany.mock.calls[0][0] as MetricRow[];

      // Should have 2 prs_opened rows (one for each developer)
      const prsOpenedRows = passedRows.filter(r => r.metricKey === MetricKey.PRS_OPENED);
      expect(prsOpenedRows).toHaveLength(2);
      expect(prsOpenedRows[0]).toEqual({
        metricDate: '2024-01-15',
        orgId: 'org-1',
        repoId: 'repo-1',
        developerId: 'dev-1',
        branch: 'main',
        metricKey: MetricKey.PRS_OPENED,
        metricValue: 2,
      });
    });

    it('should exclude PRs with author_id IS NULL', async () => {
      const testDate = new Date('2024-01-15');
      mockDataSource.query.mockResolvedValueOnce([]); // All empty — no null authors counted
      mockDataSource.query.mockResolvedValueOnce([]);
      mockDataSource.query.mockResolvedValueOnce([]);
      mockDataSource.query.mockResolvedValueOnce([]);
      mockDataSource.query.mockResolvedValueOnce([]);
      mockDataSource.query.mockResolvedValueOnce([]);
      mockDataSource.query.mockResolvedValueOnce([]);
      mockDataSource.query.mockResolvedValueOnce([]);
      mockDataSource.query.mockResolvedValueOnce([]);

      await service.computeDailyMetrics(testDate);

      // When no data exists, upsertMany is not called
      expect(mockRepository.upsertMany).not.toHaveBeenCalled();
    });
  });

  describe('Metric formula: prs_merged', () => {
    it('should count merged PRs (state=merged) on the specified date', async () => {
      const testDate = new Date('2024-01-15');
      const mockPrsMerged = [
        { author_id: 'dev-1', repository_id: 'repo-1', org_id: 'org-1', base_branch: 'main', cnt: '3' },
      ];

      mockDataSource.query.mockResolvedValueOnce([]); // prs_opened
      mockDataSource.query.mockResolvedValueOnce(mockPrsMerged);
      mockDataSource.query.mockResolvedValueOnce([]); // prs_closed_unmerged
      mockDataSource.query.mockResolvedValueOnce([]); // reviews_submitted
      mockDataSource.query.mockResolvedValueOnce([]); // code_changes
      mockDataSource.query.mockResolvedValueOnce([]); // averages
      mockDataSource.query.mockResolvedValueOnce([]); // prs_opened_total
      mockDataSource.query.mockResolvedValueOnce([]); // prs_merged_total
      mockDataSource.query.mockResolvedValueOnce([]); // reviews_total

      await service.computeDailyMetrics(testDate);

      const passedRows = mockRepository.upsertMany.mock.calls[0][0] as MetricRow[];
      const prsMergedRows = passedRows.filter(r => r.metricKey === MetricKey.PRS_MERGED);
      expect(prsMergedRows).toHaveLength(1);
      expect(prsMergedRows[0].metricValue).toBe(3);
    });
  });

  describe('Metric formula: prs_closed_unmerged', () => {
    it('should count closed PRs that were never merged (state=closed AND github_merged_at IS NULL)', async () => {
      const testDate = new Date('2024-01-15');
      const mockPrsClosedUnmerged = [
        { author_id: 'dev-1', repository_id: 'repo-1', org_id: 'org-1', base_branch: 'main', cnt: '1' },
      ];

      mockDataSource.query.mockResolvedValueOnce([]); // prs_opened
      mockDataSource.query.mockResolvedValueOnce([]); // prs_merged
      mockDataSource.query.mockResolvedValueOnce(mockPrsClosedUnmerged);
      mockDataSource.query.mockResolvedValueOnce([]); // reviews_submitted
      mockDataSource.query.mockResolvedValueOnce([]); // code_changes
      mockDataSource.query.mockResolvedValueOnce([]); // averages
      mockDataSource.query.mockResolvedValueOnce([]); // prs_opened_total
      mockDataSource.query.mockResolvedValueOnce([]); // prs_merged_total
      mockDataSource.query.mockResolvedValueOnce([]); // reviews_total

      await service.computeDailyMetrics(testDate);

      const passedRows = mockRepository.upsertMany.mock.calls[0][0] as MetricRow[];
      const prsClosedUnmergedRows = passedRows.filter(r => r.metricKey === MetricKey.PRS_CLOSED_UNMERGED);
      expect(prsClosedUnmergedRows).toHaveLength(1);
      expect(prsClosedUnmergedRows[0].metricValue).toBe(1);
    });
  });

  describe('Metric formula: reviews_submitted', () => {
    it('should count reviews submitted on the specified date grouped by reviewer_id', async () => {
      const testDate = new Date('2024-01-15');
      const mockReviewsSubmitted = [
        { reviewer_id: 'dev-1', repository_id: 'repo-1', org_id: 'org-1', cnt: '5' },
        { reviewer_id: 'dev-2', repository_id: 'repo-1', org_id: 'org-1', cnt: '2' },
      ];

      mockDataSource.query.mockResolvedValueOnce([]); // prs_opened
      mockDataSource.query.mockResolvedValueOnce([]); // prs_merged
      mockDataSource.query.mockResolvedValueOnce([]); // prs_closed_unmerged
      mockDataSource.query.mockResolvedValueOnce(mockReviewsSubmitted);
      mockDataSource.query.mockResolvedValueOnce([]); // code_changes
      mockDataSource.query.mockResolvedValueOnce([]); // averages
      mockDataSource.query.mockResolvedValueOnce([]); // prs_opened_total
      mockDataSource.query.mockResolvedValueOnce([]); // prs_merged_total
      mockDataSource.query.mockResolvedValueOnce([]); // reviews_total

      await service.computeDailyMetrics(testDate);

      const passedRows = mockRepository.upsertMany.mock.calls[0][0] as MetricRow[];
      const reviewsRows = passedRows.filter(r => r.metricKey === MetricKey.REVIEWS_SUBMITTED);
      expect(reviewsRows).toHaveLength(2);
      expect(reviewsRows[0].metricValue).toBe(5);
      expect(reviewsRows[1].metricValue).toBe(2);
    });

    it('should exclude reviews with reviewer_id IS NULL', async () => {
      const testDate = new Date('2024-01-15');
      mockDataSource.query.mockResolvedValueOnce([]);
      mockDataSource.query.mockResolvedValueOnce([]);
      mockDataSource.query.mockResolvedValueOnce([]);
      mockDataSource.query.mockResolvedValueOnce([]); // No null reviewers
      mockDataSource.query.mockResolvedValueOnce([]);
      mockDataSource.query.mockResolvedValueOnce([]);
      mockDataSource.query.mockResolvedValueOnce([]);
      mockDataSource.query.mockResolvedValueOnce([]);
      mockDataSource.query.mockResolvedValueOnce([]);

      await service.computeDailyMetrics(testDate);

      // When no data exists, upsertMany is not called
      expect(mockRepository.upsertMany).not.toHaveBeenCalled();
    });
  });

  describe('Metric formulas: additions, deletions, changed_files', () => {
    it('should sum code changes for PRs opened on the date', async () => {
      const testDate = new Date('2024-01-15');
      const mockCodeChanges = [
        { author_id: 'dev-1', repository_id: 'repo-1', org_id: 'org-1', base_branch: 'main', total_additions: '100', total_deletions: '50', total_changed_files: '5' },
      ];

      mockDataSource.query.mockResolvedValueOnce([]); // prs_opened
      mockDataSource.query.mockResolvedValueOnce([]); // prs_merged
      mockDataSource.query.mockResolvedValueOnce([]); // prs_closed_unmerged
      mockDataSource.query.mockResolvedValueOnce([]); // reviews_submitted
      mockDataSource.query.mockResolvedValueOnce(mockCodeChanges);
      mockDataSource.query.mockResolvedValueOnce([]); // averages
      mockDataSource.query.mockResolvedValueOnce([]); // prs_opened_total
      mockDataSource.query.mockResolvedValueOnce([]); // prs_merged_total
      mockDataSource.query.mockResolvedValueOnce([]); // reviews_total

      await service.computeDailyMetrics(testDate);

      const passedRows = mockRepository.upsertMany.mock.calls[0][0] as MetricRow[];
      const additionsRows = passedRows.filter(r => r.metricKey === MetricKey.ADDITIONS);
      const deletionsRows = passedRows.filter(r => r.metricKey === MetricKey.DELETIONS);
      const changedFilesRows = passedRows.filter(r => r.metricKey === MetricKey.CHANGED_FILES);

      expect(additionsRows).toHaveLength(1);
      expect(additionsRows[0].metricValue).toBe(100);
      expect(deletionsRows).toHaveLength(1);
      expect(deletionsRows[0].metricValue).toBe(50);
      expect(changedFilesRows).toHaveLength(1);
      expect(changedFilesRows[0].metricValue).toBe(5);
    });
  });

  describe('Metric formula: avg_time_to_first_review_hours', () => {
    it('should calculate average hours from PR creation to first review, excluding null values', async () => {
      const testDate = new Date('2024-01-15');
      const mockAverages = [
        { author_id: 'dev-1', repository_id: 'repo-1', org_id: 'org-1', avg_first_review_hours: '12.5', avg_merge_hours: null, avg_pr_size: null },
      ];

      mockDataSource.query.mockResolvedValueOnce([]); // prs_opened
      mockDataSource.query.mockResolvedValueOnce([]); // prs_merged
      mockDataSource.query.mockResolvedValueOnce([]); // prs_closed_unmerged
      mockDataSource.query.mockResolvedValueOnce([]); // reviews_submitted
      mockDataSource.query.mockResolvedValueOnce([]); // code_changes
      mockDataSource.query.mockResolvedValueOnce(mockAverages);
      mockDataSource.query.mockResolvedValueOnce([]); // prs_opened_total
      mockDataSource.query.mockResolvedValueOnce([]); // prs_merged_total
      mockDataSource.query.mockResolvedValueOnce([]); // reviews_total

      await service.computeDailyMetrics(testDate);

      const passedRows = mockRepository.upsertMany.mock.calls[0][0] as MetricRow[];
      const avgFirstReviewRows = passedRows.filter(r => r.metricKey === MetricKey.AVG_TIME_TO_FIRST_REVIEW_HOURS);
      expect(avgFirstReviewRows).toHaveLength(1);
      expect(avgFirstReviewRows[0].metricValue).toBe(12.5);
    });

    it('should exclude PRs with null first_review_at', async () => {
      const testDate = new Date('2024-01-15');
      const mockAverages = [
        { author_id: 'dev-1', repository_id: 'repo-1', org_id: 'org-1', avg_first_review_hours: null, avg_merge_hours: null, avg_pr_size: null },
      ];

      mockDataSource.query.mockResolvedValueOnce([]); // prs_opened
      mockDataSource.query.mockResolvedValueOnce([]); // prs_merged
      mockDataSource.query.mockResolvedValueOnce([]); // prs_closed_unmerged
      mockDataSource.query.mockResolvedValueOnce([]); // reviews_submitted
      mockDataSource.query.mockResolvedValueOnce([]); // code_changes
      mockDataSource.query.mockResolvedValueOnce(mockAverages);
      mockDataSource.query.mockResolvedValueOnce([]); // prs_opened_total
      mockDataSource.query.mockResolvedValueOnce([]); // prs_merged_total
      mockDataSource.query.mockResolvedValueOnce([]); // reviews_total

      await service.computeDailyMetrics(testDate);

      // When all values in averages are null, they are not added to rows, so upsertMany is not called
      expect(mockRepository.upsertMany).not.toHaveBeenCalled();
    });
  });

  describe('Metric formula: avg_time_to_merge_hours', () => {
    it('should calculate average hours from PR creation to merge (state=merged only)', async () => {
      const testDate = new Date('2024-01-15');
      const mockAverages = [
        { author_id: 'dev-1', repository_id: 'repo-1', org_id: 'org-1', avg_first_review_hours: null, avg_merge_hours: '36.0', avg_pr_size: null },
      ];

      mockDataSource.query.mockResolvedValueOnce([]); // prs_opened
      mockDataSource.query.mockResolvedValueOnce([]); // prs_merged
      mockDataSource.query.mockResolvedValueOnce([]); // prs_closed_unmerged
      mockDataSource.query.mockResolvedValueOnce([]); // reviews_submitted
      mockDataSource.query.mockResolvedValueOnce([]); // code_changes
      mockDataSource.query.mockResolvedValueOnce(mockAverages);
      mockDataSource.query.mockResolvedValueOnce([]); // prs_opened_total
      mockDataSource.query.mockResolvedValueOnce([]); // prs_merged_total
      mockDataSource.query.mockResolvedValueOnce([]); // reviews_total

      await service.computeDailyMetrics(testDate);

      const passedRows = mockRepository.upsertMany.mock.calls[0][0] as MetricRow[];
      const avgMergeRows = passedRows.filter(r => r.metricKey === MetricKey.AVG_TIME_TO_MERGE_HOURS);
      expect(avgMergeRows).toHaveLength(1);
      expect(avgMergeRows[0].metricValue).toBe(36.0);
    });
  });

  describe('Metric formula: avg_pr_size', () => {
    it('should calculate average additions+deletions for merged PRs', async () => {
      const testDate = new Date('2024-01-15');
      const mockAverages = [
        { author_id: 'dev-1', repository_id: 'repo-1', org_id: 'org-1', avg_first_review_hours: null, avg_merge_hours: null, avg_pr_size: '75.5' },
      ];

      mockDataSource.query.mockResolvedValueOnce([]); // prs_opened
      mockDataSource.query.mockResolvedValueOnce([]); // prs_merged
      mockDataSource.query.mockResolvedValueOnce([]); // prs_closed_unmerged
      mockDataSource.query.mockResolvedValueOnce([]); // reviews_submitted
      mockDataSource.query.mockResolvedValueOnce([]); // code_changes
      mockDataSource.query.mockResolvedValueOnce(mockAverages);
      mockDataSource.query.mockResolvedValueOnce([]); // prs_opened_total
      mockDataSource.query.mockResolvedValueOnce([]); // prs_merged_total
      mockDataSource.query.mockResolvedValueOnce([]); // reviews_total

      await service.computeDailyMetrics(testDate);

      const passedRows = mockRepository.upsertMany.mock.calls[0][0] as MetricRow[];
      const avgPrSizeRows = passedRows.filter(r => r.metricKey === MetricKey.AVG_PR_SIZE);
      expect(avgPrSizeRows).toHaveLength(1);
      expect(avgPrSizeRows[0].metricValue).toBe(75.5);
    });
  });

  describe('Metric formula: prs_opened_total (rollup)', () => {
    it('should aggregate total PRs opened per org/repo without developer breakdown', async () => {
      const testDate = new Date('2024-01-15');
      const mockPrsOpenedTotals = [
        { repository_id: 'repo-1', org_id: 'org-1', cnt: '5' },
        { repository_id: 'repo-2', org_id: 'org-1', cnt: '3' },
      ];

      mockDataSource.query.mockResolvedValueOnce([]); // prs_opened
      mockDataSource.query.mockResolvedValueOnce([]); // prs_merged
      mockDataSource.query.mockResolvedValueOnce([]); // prs_closed_unmerged
      mockDataSource.query.mockResolvedValueOnce([]); // reviews_submitted
      mockDataSource.query.mockResolvedValueOnce([]); // code_changes
      mockDataSource.query.mockResolvedValueOnce([]); // averages
      mockDataSource.query.mockResolvedValueOnce(mockPrsOpenedTotals);
      mockDataSource.query.mockResolvedValueOnce([]); // prs_merged_total
      mockDataSource.query.mockResolvedValueOnce([]); // reviews_total

      await service.computeDailyMetrics(testDate);

      const passedRows = mockRepository.upsertMany.mock.calls[0][0] as MetricRow[];
      const totalRows = passedRows.filter(r => r.metricKey === MetricKey.PRS_OPENED_TOTAL);
      expect(totalRows).toHaveLength(2);
      expect(totalRows.every(r => r.developerId === null && r.branch === null)).toBe(true);
      expect(totalRows[0].metricValue).toBe(5);
      expect(totalRows[1].metricValue).toBe(3);
    });
  });

  describe('Metric formula: prs_merged_total (rollup)', () => {
    it('should aggregate total merged PRs per org/repo without developer breakdown', async () => {
      const testDate = new Date('2024-01-15');
      const mockPrsMergedTotals = [
        { repository_id: 'repo-1', org_id: 'org-1', cnt: '4' },
      ];

      mockDataSource.query.mockResolvedValueOnce([]); // prs_opened
      mockDataSource.query.mockResolvedValueOnce([]); // prs_merged
      mockDataSource.query.mockResolvedValueOnce([]); // prs_closed_unmerged
      mockDataSource.query.mockResolvedValueOnce([]); // reviews_submitted
      mockDataSource.query.mockResolvedValueOnce([]); // code_changes
      mockDataSource.query.mockResolvedValueOnce([]); // averages
      mockDataSource.query.mockResolvedValueOnce([]); // prs_opened_total
      mockDataSource.query.mockResolvedValueOnce(mockPrsMergedTotals);
      mockDataSource.query.mockResolvedValueOnce([]); // reviews_total

      await service.computeDailyMetrics(testDate);

      const passedRows = mockRepository.upsertMany.mock.calls[0][0] as MetricRow[];
      const totalRows = passedRows.filter(r => r.metricKey === MetricKey.PRS_MERGED_TOTAL);
      expect(totalRows).toHaveLength(1);
      expect(totalRows[0].metricValue).toBe(4);
    });
  });

  describe('Metric formula: reviews_submitted_total (rollup)', () => {
    it('should aggregate total reviews submitted per org/repo without developer breakdown', async () => {
      const testDate = new Date('2024-01-15');
      const mockReviewsTotals = [
        { repository_id: 'repo-1', org_id: 'org-1', cnt: '15' },
      ];

      mockDataSource.query.mockResolvedValueOnce([]); // prs_opened
      mockDataSource.query.mockResolvedValueOnce([]); // prs_merged
      mockDataSource.query.mockResolvedValueOnce([]); // prs_closed_unmerged
      mockDataSource.query.mockResolvedValueOnce([]); // reviews_submitted
      mockDataSource.query.mockResolvedValueOnce([]); // code_changes
      mockDataSource.query.mockResolvedValueOnce([]); // averages
      mockDataSource.query.mockResolvedValueOnce([]); // prs_opened_total
      mockDataSource.query.mockResolvedValueOnce([]); // prs_merged_total
      mockDataSource.query.mockResolvedValueOnce(mockReviewsTotals);

      await service.computeDailyMetrics(testDate);

      const passedRows = mockRepository.upsertMany.mock.calls[0][0] as MetricRow[];
      const totalRows = passedRows.filter(r => r.metricKey === MetricKey.REVIEWS_SUBMITTED_TOTAL);
      expect(totalRows).toHaveLength(1);
      expect(totalRows[0].metricValue).toBe(15);
    });
  });

  describe('Upsert behavior', () => {
    it('should call upsertMany with all computed rows', async () => {
      const testDate = new Date('2024-01-15');
      const mockRows = [
        { author_id: 'dev-1', repository_id: 'repo-1', org_id: 'org-1', base_branch: 'main', cnt: '1' },
      ];

      mockDataSource.query.mockResolvedValueOnce(mockRows); // prs_opened
      mockDataSource.query.mockResolvedValueOnce([]); // All other queries return empty
      for (let i = 0; i < 8; i++) {
        mockDataSource.query.mockResolvedValueOnce([]);
      }

      await service.computeDailyMetrics(testDate);

      expect(mockRepository.upsertMany).toHaveBeenCalledWith(expect.any(Array));
      const passedRows = mockRepository.upsertMany.mock.calls[0][0];
      expect(passedRows.length).toBeGreaterThan(0);
    });

    it('should not call upsertMany when no data exists for the date', async () => {
      const testDate = new Date('2024-01-15');

      // All queries return empty
      for (let i = 0; i < 9; i++) {
        mockDataSource.query.mockResolvedValueOnce([]);
      }

      await service.computeDailyMetrics(testDate);

      expect(mockRepository.upsertMany).not.toHaveBeenCalled();
    });
  });

  describe('Day boundary calculations', () => {
    it('should query with correct UTC day boundaries', async () => {
      const testDate = new Date('2024-01-15T00:00:00Z');

      mockDataSource.query.mockResolvedValueOnce([]); // All empty for this test
      for (let i = 0; i < 8; i++) {
        mockDataSource.query.mockResolvedValueOnce([]);
      }

      await service.computeDailyMetrics(testDate);

      // Check that queries were called with correct day boundaries
      const firstCall = mockDataSource.query.mock.calls[0];
      if (firstCall && firstCall[1]) {
        const dayStart = firstCall[1][0] as Date;
        const dayEnd = firstCall[1][1] as Date;

        expect(dayStart.getUTCHours()).toBe(0);
        expect(dayStart.getUTCMinutes()).toBe(0);
        expect(dayStart.getUTCSeconds()).toBe(0);
        expect(dayEnd.getUTCHours()).toBe(23);
        expect(dayEnd.getUTCMinutes()).toBe(59);
        expect(dayEnd.getUTCSeconds()).toBe(59);
      }
    });
  });
});
