# End-to-End Implementation Checklist

This checklist exists because the most common failure mode in AI-assisted development is half-implementations: read logic without write logic, forms that submit to nowhere, auth checks on some routes but not others, error states that are never shown.

## The Non-Negotiable Rule

**If you implement any part of a feature, implement all parts.**

A feature is only complete when a user can:
1. Create the data
2. Read/view the data
3. Update the data
4. Delete the data (or archive/soft-delete)
5. See loading states while any of the above happen
6. See error states if any of the above fail
7. Be blocked from doing any of the above if not authenticated/authorized

## Per-Feature Checklist

For every feature/entity being implemented, verify:

### Data Layer
- [ ] Prisma schema has the model defined
- [ ] Migration created (`prisma migrate dev`)
- [ ] All CRUD operations implemented (create, read, update, delete)
- [ ] Soft delete if records should not be permanently removed
- [ ] Relations properly set up

### API Layer (NestJS) or Server Actions (Next.js)
- [ ] Create endpoint/action
- [ ] Read (single + list) endpoint/action
- [ ] Update endpoint/action
- [ ] Delete endpoint/action
- [ ] Auth check on ALL mutations (never skip)
- [ ] Input validation (DTOs + class-validator in NestJS, Zod in Next.js)
- [ ] Proper error responses (400 for bad input, 401 for unauth, 404 for not found)

### UI Layer
- [ ] List view (empty state + populated state)
- [ ] Detail/single view
- [ ] Create form (wired to real API/server action)
- [ ] Edit form (wired to real API/server action, pre-populated)
- [ ] Delete confirmation (modal or confirm dialog)
- [ ] Loading skeleton or spinner for every fetch
- [ ] Error message displayed when API fails
- [ ] Success feedback (toast, redirect, or inline message)

### Auth & Access
- [ ] Unauthenticated users redirected or see error
- [ ] Authorization checked (user can only see/edit their own data)
- [ ] Protected routes have middleware or guard

## Red Flags — Stop and Fix Before Moving On

- **`// TODO: implement`** in any production code path
- **Hardcoded/dummy data** returned from any function (use real DB calls)
- **`console.log` debugging** left in submitted code
- **`any` type** in TypeScript (use proper types or `unknown` + narrowing)
- **Unhandled promise** — every async call needs `.catch()` or try/catch
- **Missing loading state** — any data fetch needs a loading indicator
- **Form that doesn't submit** — every form must wire to a real handler
- **Unreachable code path** — if you can navigate to a page, it must work

## What "Complete" Means

A feature is complete when you can demo it from scratch:
1. Start with no data
2. Create something
3. See it in the list
4. Click into it and see details
5. Edit it
6. Delete it
7. Try all of the above while not logged in (blocked appropriately)

If any step in that flow breaks, it's not complete.
