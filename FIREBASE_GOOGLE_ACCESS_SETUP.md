# Firebase and Google Drive access setup

The website member portal is in `account/`. The restricted Google Drive root
folder is:

<https://drive.google.com/drive/folders/1dKi4_lmIBOxMlM-qHb1tjBFbtYuNm92U>

## 1. Create and connect Firebase

1. Open the `mse-learning-lab` project in the Firebase console.
2. The Web app configuration is already connected in `account/firebase-config.js`.
3. In Authentication, enable the Google provider.
4. Add `muralipalla.github.io` to Authentication > Settings > Authorized domains.
5. Create a Firestore database in production mode.

The Firebase web configuration is not a secret. Do not place service-account
JSON, private keys, OAuth client secrets, or Drive credentials in this repo.

## 2. Deploy Firestore authorization

Deploy `firestore.rules` and `firestore.indexes.json` with the Firebase CLI, or
paste the rules into the Firestore Rules console and create the composite index
shown in `firestore.indexes.json`.

## 3. Bootstrap the first administrator

1. Visit `/account/` and sign in as `bitspilanimurali@gmail.com`.
2. The portal creates that account as an active administrator.
3. Every other first-time Google sign-in is registered as a pending student.

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
