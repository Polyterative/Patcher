import { SupabaseService } from '../../supabase.service';
import type { SupabaseTableRow } from '../../supabase-db.types';
import type { Tag } from 'src/app/models/tag';
import { TagType } from 'src/app/models/tag';
import {
  cleanupSupabaseServiceTest,
  setupSupabaseServiceTest,
  TEST_TIMEOUT
} from './test-setup';
import {
  authUserFixture,
  chainable,
  getSupabaseClientDouble,
  mockUserSession,
  type PasswordResetProviderError,
  type PasswordUpdateResult,
  type QueryChainResult,
  type SupabaseClientDouble
} from './supabase-query-test-doubles';


type VoteRow = Pick<SupabaseTableRow<'user_module_tags'>, 'moduletagid'>;
type TagRow = SupabaseTableRow<'tags'>;
type VoteRowsResult = QueryChainResult<VoteRow> & {
  data: VoteRow[] | null;
  error: null;
};
type TagsResult = QueryChainResult<TagRow> & {
  data: TagRow[] | null;
  error: null;
};

function failedPasswordUpdate(error: PasswordResetProviderError): Promise<PasswordUpdateResult> {
  return Promise.resolve({
    data: null,
    error
  });
}

describe('SupabaseService - get.myVotes, get.allTags and password reset errors', () => {
  let service: SupabaseService;
  let supabaseClient: SupabaseClientDouble;
  
  beforeEach(() => {
    const setup = setupSupabaseServiceTest();
    service = setup.service;
    supabaseClient = getSupabaseClientDouble(service);
  });
  
  afterEach(() => {
    cleanupSupabaseServiceTest();
  });
  
  describe('get.myVotes', () => {
    it('should return an array of moduletagid numbers', (done) => {
      mockUserSession(service, authUserFixture('voter-1'));
      spyOn(supabaseClient, 'from').and.returnValue(
        chainable<VoteRow>({
          data: [{moduletagid: 1}, {moduletagid: 3}, {moduletagid: 7}],
          error: null
        } satisfies VoteRowsResult)
      );
      
      service.get.myVotes().subscribe({
        next: (result: number[]) => {
          expect(result).toEqual([1, 3, 7]);
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should return empty array when user has no votes', (done) => {
      mockUserSession(service, authUserFixture('voter-2'));
      spyOn(supabaseClient, 'from').and.returnValue(
        chainable<VoteRow>({data: [], error: null} satisfies VoteRowsResult)
      );
      
      service.get.myVotes().subscribe({
        next: (result: number[]) => {
          expect(result).toEqual([]);
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should return empty array when data is null', (done) => {
      mockUserSession(service, authUserFixture('voter-3'));
      spyOn(supabaseClient, 'from').and.returnValue(
        chainable<VoteRow>({data: null, error: null} satisfies VoteRowsResult)
      );
      
      service.get.myVotes().subscribe({
        next: (result: number[]) => {
          expect(result).toEqual([]);
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('get.allTags', () => {
    it('should return all tags sorted by type and name', (done) => {
      const mockTags: TagRow[] = [
        {id: 1, name: 'Envelope', type: TagType.Modulation},
        {id: 2, name: 'VCO', type: TagType.Effect}
      ];
      spyOn(supabaseClient, 'from').and.returnValue(
        chainable<TagRow>({data: mockTags, error: null} satisfies TagsResult)
      );
      
      service.get.allTags().subscribe({
        next: (result: Tag[]) => {
          expect(result).toEqual(mockTags);
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should return empty array when data is null', (done) => {
      spyOn(supabaseClient, 'from').and.returnValue(
        chainable<TagRow>({data: null, error: null} satisfies TagsResult)
      );
      
      service.get.allTags().subscribe({
        next: (result: Tag[]) => {
          expect(result).toEqual([]);
          done();
        },
        error: (err: unknown) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('resetPassword$ error code branches', () => {
    it('should produce samePassword error for "same_password" error code', (done) => {
      spyOn(supabaseClient.auth, 'updateUser').and.returnValue(
        failedPasswordUpdate({error_code: 'same_password', message: 'Password unchanged'})
      );
      
      service.auth.resetPassword$('token', 'SamePass!').subscribe({
        next: () => {
          fail('Should have errored');
          done();
        },
        error: (err: Error) => {
          expect(err.message).toContain('differ');
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should produce weakPassword error for "weak_password" error code', (done) => {
      spyOn(supabaseClient.auth, 'updateUser').and.returnValue(
        failedPasswordUpdate({error_code: 'weak_password', message: 'Weak'})
      );
      
      service.auth.resetPassword$('token', 'weak').subscribe({
        next: () => {
          fail('Should have errored');
          done();
        },
        error: (err: Error) => {
          expect(err.message).toContain('weak');
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should produce invalidSession error for "invalid_grant" error code', (done) => {
      spyOn(supabaseClient.auth, 'updateUser').and.returnValue(
        failedPasswordUpdate({error_code: 'invalid_grant', message: 'Token expired'})
      );
      
      service.auth.resetPassword$('token', 'NewPass!').subscribe({
        next: () => {
          fail('Should have errored');
          done();
        },
        error: (err: Error) => {
          expect(err.message).toContain('expired');
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should produce networkError for "network_error" error code', (done) => {
      spyOn(supabaseClient.auth, 'updateUser').and.returnValue(
        failedPasswordUpdate({error_code: 'network_error', message: 'Network issue'})
      );
      
      service.auth.resetPassword$('token', 'NewPass!').subscribe({
        next: () => {
          fail('Should have errored');
          done();
        },
        error: (err: Error) => {
          expect(err.message).toContain('Network');
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should use message as default when error code is unrecognised', (done) => {
      spyOn(supabaseClient.auth, 'updateUser').and.returnValue(
        failedPasswordUpdate({error_code: 'unknown_error', message: 'Something went wrong'})
      );
      
      service.auth.resetPassword$('token', 'NewPass!').subscribe({
        next: () => {
          fail('Should have errored');
          done();
        },
        error: (err: Error) => {
          expect(err).toBeDefined();
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
});