export interface FirebaseModel {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export const firebaseConfig: FirebaseModel = {
  apiKey:            'AIzaSyDybIV2Od5rrTQnlyYKYsjEbu9n6gdE3Nk',
  authDomain:        'focus-e10e7.firebaseapp.com',
  databaseURL:       'https://focus-e10e7.firebaseio.com',
  projectId:         'focus-e10e7',
  storageBucket:     'focus-e10e7.appspot.com',
  messagingSenderId: '891782944209',
  appId:             '1:891782944209:web:1313c1c1408cce60'
};
