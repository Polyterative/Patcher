import { EnvironmentModel } from 'src/environments/environment.model';
import { firebaseConfig }   from 'src/environments/firebase';

export const environment: EnvironmentModel = {
    production: true,
    supabase:   {
        url: 'https://sozmatmywjpstwidzlss.supabase.co',
        key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlhdCI6MTYxODA4NDU1OCwiZXhwIjoxOTMzNjYwNTU4fQ.3pSLsqyaCAGgISvOrHMt2CIX9hQowty2r8etzMwlpy8'
    },
    firebase: firebaseConfig
};