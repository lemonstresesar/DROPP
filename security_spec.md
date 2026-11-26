# DROPP Security Specification (Phases 1–4)

## 1. Data Invariants
1. **No Self-Assigned Roles**: On `/users/{userId}` creation, clients may only register with `role == 'client'` and `vendorStatus == 'none'` and `isCertified == false`. Only verified admins can elevate roles or certification.
2. **PII & KYC Isolation**: User email, phone, and physical address live in `/users/{userId}/private/info`; Vendor CNI recto/verso + selfie live in `/kycApplications/{applicationId}` and are readable/writable only by the applicant or `isAdmin()`.
3. **Server/Admin-Controlled Wallets & Ledger**: `/wallets/{userId}` and `/walletTransactions/{txId}` are never writable by standard clients or vendors (`allow write: if isAdmin()`).
4. **Approved Shop Enforcement**: Unapproved or suspended shops (`vendorStatus != 'approved'`) cannot publish visible posts or respond to RFQs.
5. **Comment, Review & Like Identity Integrity**: Comments, reviews, likes, bookmarks, and follow records strictly enforce `authorId == request.auth.uid` / `userId == request.auth.uid` and verify parent `/posts/{postId}` existence.
6. **Escrow State Integrity**: Buyers create `/orders/{orderId}` only with `buyerId == request.auth.uid`, `status in ['awaiting_payment', 'pending']`, and `escrowStatus == 'held'`. Only the vendor owner can advance `pending -> confirmed -> delivering`, only the buyer can release escrow upon delivery (`escrowStatus == 'released'`) or cancel before vendor confirmation, and only `isAdmin()` can adjudicate disputes (`resolved_buyer` / `resolved_vendor`).
7. **Conversation & RFQ Master Gate**: Subcollection messages `/conversations/{conversationId}/messages/{messageId}` require the sender to match `buyerId` or `vendorOwnerId` of the parent conversation via `get()`. RFQ offers require an existing open parent RFQ and an approved shop owned by the caller.
8. **Immutable Ownership & Timestamps**: `uid`, `ownerId`, `buyerId`, `createdAt` are immutable after creation; `createdAt == request.time` on create and `updatedAt == request.time` on update.

## 2. The "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. **Role Escalation on Signup**: `POST /users/{uid}` with `{ role: "admin" }`.
2. **Self-Certification Spoof**: `PATCH /users/{uid}` with `{ isCertified: true }`.
3. **Shadow Ghost Field Injection**: `POST /users/{uid}` with `{ ..., shadowAdmin: true }`.
4. **PII / KYC Scraping**: `GET /users/{otherUid}/private/info` or `GET /kycApplications/{otherApp}` as another signed-in user.
5. **Wallet Balance Tampering**: `PATCH /wallets/{uid}` with `{ availableFcfa: 9999999 }`.
6. **Escrow Bypass on Order Creation**: `POST /orders/{orderId}` as buyer with `{ escrowStatus: "released", status: "delivered" }`.
7. **Vendor Stealing Escrow Release**: `PATCH /orders/{orderId}` as vendor setting `{ escrowStatus: "released" }` without buyer confirmation or admin resolution.
8. **Dispute Outcome Tampering**: `PATCH /disputes/{disputeId}` as buyer/vendor trying to set `{ status: "resolved_buyer" }`.
9. **ID Poisoning**: `POST /posts/invalid$$id_over_128_chars...` with disallowed characters.
10. **Orphaned Message / Offer**: `POST /conversations/nonexistent/messages/m1` or `POST /rfqs/nonexistent/offers/o1`.
11. **Client Timestamp Forgery**: `POST /posts/p1/comments/c1` with `{ createdAt: "2020-01-01T00:00:00Z" }`.
12. **Blanket Order / User List Scrape**: `LIST /orders` or `LIST /users` by a standard client trying to read other users' documents.
