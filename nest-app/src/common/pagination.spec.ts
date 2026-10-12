import {
  createPaginatedResponse,
  resolvePaginationOptions,
} from './pagination';

describe('resolvePaginationOptions', () => {
  it('uses the provided page size and defaults for omitted query values', () => {
    expect(resolvePaginationOptions({}, 10)).toEqual({
      page: 1,
      perPage: 10,
      enabled: true,
    });
  });

  it.each(['false', '0', 'off', 'no', 'FALSE', 'Off'])(
    'disables pagination for "%s"',
    (pagination) => {
      expect(
        resolvePaginationOptions({ page: 3, per_page: 25, pagination }, 10),
      ).toEqual({
        page: 3,
        perPage: 25,
        enabled: false,
      });
    },
  );

  it('keeps pagination enabled for other values', () => {
    expect(resolvePaginationOptions({ pagination: 'yes' }, 100)).toEqual({
      page: 1,
      perPage: 100,
      enabled: true,
    });
  });
});

describe('createPaginatedResponse', () => {
  it('returns page metadata without URL or links fields', () => {
    const result = createPaginatedResponse(['a', 'b'], {
      page: 2,
      perPage: 2,
      total: 5,
    });

    expect(result).toEqual({
      current_page: 2,
      data: ['a', 'b'],
      from: 3,
      last_page: 3,
      per_page: 2,
      to: 4,
      total: 5,
    });
  });

  it('uses null item bounds and a single page for empty results', () => {
    const result = createPaginatedResponse([], {
      page: 1,
      perPage: 100,
      total: 0,
    });

    expect(result).toMatchObject({
      current_page: 1,
      data: [],
      from: null,
      last_page: 1,
      per_page: 100,
      to: null,
      total: 0,
    });
  });
});
