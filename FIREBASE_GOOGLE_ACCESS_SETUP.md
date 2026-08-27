# Firebase and Google Drive access setup

The website member portal is in `account/`. The restricted Google Drive root
folder is:

<https://drive.google.com/drive/folders/1dKi4_lmIBOxMlM-qHb1tjBFbtYuNm92U>

## 1. Create and connect Firebase

1. Create a Firebase project in the Firebase console.
2. Add a Web app to the project.
3. In Authentication, enable the Google provider.
4. Add `muralipalla.github.io` to Authentication > Settings > Authorized domains.
5. Create a Firestore database in production mode.
6. Copy the Web app configuration into `account/firebase-config.js`.

The Firebase web configuration is not a secret. Do not place service-account
JSON, private keys, OAuth client secrets, or Drive credentials in this repo.

## 2. Deploy Firestore authorization

Deploy `firestore.rules` and `firestore.indexes.json` with the Firebase CLI, or
paste the rules into the Firestore Rules console and create the composite index
shown in `firestore.indexes.json`.

## 3. Bootstrap the first administrator

1. Visit `/account/` and sign in with the intended administrator Google account.
2. The portal creates `users/<firebase-uid>` with `status: pending` and
   `role: student`.
3. In the Firestore console, change that document to `status: active` and
   `role: admin`.
4. Reload the member portal. The administrator interface will appear.

## 4. Add protected resources

1. Upload files into the restricted Drive folders.
2. Keep General access set to Restricted.
3. Add approved user emails as Viewers, or share the parent folder with a
   course Google Group.
4. In the website administrator interface, add the restricted Drive link and
   select the website roles that may see it.

Website approval and Drive permission are intentionally separate. Revoking a
user requires both blocking the website account and removing their Drive or
Google Group permission.
