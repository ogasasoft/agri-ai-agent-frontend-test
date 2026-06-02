// @ts-expect-error - Tests only, not included in production build
import { MockDbClient } from '__tests__/setup/test-utils';

let mockClient: any = null;

export function getMockDbClient() {
  if (!mockClient) {
    mockClient = MockDbClient.getInstance();
  }
  return mockClient;
}
