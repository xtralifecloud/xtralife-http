# xtralife http changelog

## 4.1.3-beta
xtralife-api: 4.2.6 </br>

- remove user device token older than 1 month on login
- add token param for device token registration on login
- add message details on event route
- fix tests (due to config)

## 4.1.2
xtralife-api: 4.2.5 </br>

- fix gamerVFS binary deletion route

## 4.1.1
xtralife-api: 4.2.1 </br>

- add "credentials" key for external login

## 4.1.0
xtralife-api: 4.2.1 </br>

- add/update routes for login/convert (email, steam, google, firebase, gamecenter, apple, facebook)
- add "credentials" key for all login/convert routes (instead of "id"/"secret")

## 4.0.2
xtralife-api: 4.1.1 </br>

- add count in find users response
- fix VFS routes

## 4.0.1
xtralife-api: 4.0.2 </br>

- add semver ^ for xtralife dependencies

## 4.0.0
xtralife-api: 4.0.0 </br>

- update npm dependencies