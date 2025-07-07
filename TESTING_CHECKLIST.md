# 🧪 NUMERICALZ TESTING CHECKLIST

## ⚠️ **MANDATORY: Test Everything Before Pushing to Main**

This checklist MUST be completed before any code reaches the main branch and production.

## 🔍 **Pre-Push Testing Protocol**

### **Phase 1: Authentication System (CRITICAL)**
- [ ] **Login Process**
  - [ ] Email/password authentication works
  - [ ] OTP generation and sending works  
  - [ ] OTP verification works
  - [ ] Session creation works
  - [ ] Dashboard redirect works
- [ ] **Different User Roles**
  - [ ] PARTNER login and access
  - [ ] MANAGER login and access  
  - [ ] STAFF login and access
- [ ] **Edge Cases**
  - [ ] Wrong password handling
  - [ ] Expired OTP handling
  - [ ] Invalid OTP handling
  - [ ] Rate limiting works

### **Phase 2: Core Client Management**
- [ ] **Client Operations**
  - [ ] View clients list (all types)
  - [ ] Add new client
  - [ ] Edit existing client
  - [ ] Delete client (if applicable)
  - [ ] Search/filter clients
- [ ] **Client Assignment**
  - [ ] Assign user to client
  - [ ] Reassign client to different user
  - [ ] Bulk assignment operations
  - [ ] "Assigned to me" filter works
- [ ] **Client Data Integrity**
  - [ ] Companies House data sync
  - [ ] Client codes generate correctly (NZ-X format)
  - [ ] Contact information (email/phone icons work)

### **Phase 3: VAT Management System**
- [ ] **VAT Quarters**
  - [ ] VAT quarter creation works
  - [ ] VAT workflow progression
  - [ ] VAT assignment system
  - [ ] VAT deadline calculations
- [ ] **VAT Workflows**
  - [ ] Stage progression works
  - [ ] Milestone tracking works
  - [ ] Assignment changes work
  - [ ] Timeline display correct
- [ ] **VAT Deadlines**
  - [ ] Monthly tabs show correct data
  - [ ] Status calculations accurate
  - [ ] Due date calculations correct

### **Phase 4: Ltd Companies & Deadlines**
- [ ] **Ltd Companies**
  - [ ] Ltd companies list loads
  - [ ] Workflow progression works
  - [ ] Assignment system works
  - [ ] "Assigned to me" filter works correctly
- [ ] **Accounts Deadlines**
  - [ ] Year-end calculations correct
  - [ ] Companies House due dates accurate
  - [ ] CT due date calculations correct
  - [ ] Workflow status accurate

### **Phase 5: Dashboard & Widgets**
- [ ] **Dashboard Loading**
  - [ ] Main dashboard loads for all roles
  - [ ] Partner dashboard works
  - [ ] Manager dashboard works
  - [ ] Staff dashboard works
- [ ] **Widget Functionality**
  - [ ] Client overview widget
  - [ ] Team workload widget
  - [ ] Monthly deadlines widget
  - [ ] Upcoming deadlines widget

### **Phase 6: Responsive Design & UI**
- [ ] **Desktop View**
  - [ ] All pages load correctly
  - [ ] Tables display properly (no horizontal scroll)
  - [ ] Contact icons work (email/phone)
  - [ ] Action buttons work
- [ ] **Tablet View**
  - [ ] Responsive layout works
  - [ ] Navigation works
  - [ ] Tables remain usable
- [ ] **Mobile View**
  - [ ] Pages are accessible
  - [ ] Core functionality works
  - [ ] Text remains readable

### **Phase 7: API Endpoints**
- [ ] **Critical APIs**
  - [ ] Authentication APIs work
  - [ ] Client management APIs work
  - [ ] VAT APIs work
  - [ ] Assignment APIs work
  - [ ] Dashboard APIs work
- [ ] **Error Handling**
  - [ ] APIs return proper error messages
  - [ ] Frontend handles API errors gracefully
  - [ ] No crashes on API failures

### **Phase 8: Database Operations**
- [ ] **Data Integrity**
  - [ ] No data corruption
  - [ ] Relationships maintained
  - [ ] Constraints enforced
- [ ] **Performance**
  - [ ] Queries execute reasonably fast
  - [ ] No obvious performance regressions

## 🚀 **Testing Commands & Tools**

### **Quick Smoke Test:**
```bash
# 1. Build test
npm run build

# 2. Database audit
npm run db:audit

# 3. Start dev server
npm run dev

# 4. Test production build
npm start
```

### **Manual Testing URLs:**
- **Login:** http://localhost:3001/auth/login
- **Dashboard:** http://localhost:3001/dashboard
- **Clients:** http://localhost:3001/dashboard/clients
- **VAT Deadlines:** http://localhost:3001/dashboard/clients/vat-dt
- **Ltd Companies:** http://localhost:3001/dashboard/clients/ltd-companies

## 🔄 **Recommended Development Workflow**

### **Option 1: Feature Branch Workflow (RECOMMENDED)**
```bash
# 1. Create feature branch
git checkout -b feature/your-feature-name

# 2. Make changes
# ... development work ...

# 3. Test thoroughly using this checklist
# ... complete testing ...

# 4. Push feature branch
git push origin feature/your-feature-name

# 5. Create Pull Request for review
# 6. Merge to main only after approval & testing
```

### **Option 2: Staging Branch Workflow**
```bash
# 1. Work on feature branches
# 2. Merge to staging branch first
# 3. Deploy staging to test environment
# 4. Test thoroughly in staging
# 5. Merge staging to main only after full verification
```

## 🚨 **Red Flags - Stop and Investigate**

If ANY of these occur, DO NOT push to main:
- [ ] Authentication fails in any way
- [ ] Database queries throw errors
- [ ] Build process fails
- [ ] Any existing functionality breaks
- [ ] Performance noticeably degrades
- [ ] Console shows new errors
- [ ] Mobile/responsive design breaks
- [ ] Contact icons stop working
- [ ] Assignment system breaks

## 🛡️ **Safety Measures**

### **Before Every Push:**
1. **Backup Database:** `npm run db:backup`
2. **Run Build:** `npm run build`
3. **Complete Testing:** Use this checklist
4. **Document Changes:** Clear commit messages

### **After Every Push:**
1. **Monitor Production:** Check live site works
2. **Verify Core Functions:** Auth, client management, VAT
3. **Check for Errors:** Monitor logs and user reports

### **Emergency Procedures:**
1. **Quick Rollback:** `git reset --hard [last-working-commit]`
2. **Database Restore:** `npm run db:restore [backup-file]`
3. **Authentication Rollback:** See `AUTHENTICATION_LOCK.md`

## 📊 **Testing Automation (Future Improvement)**

Consider implementing:
- [ ] Automated API testing
- [ ] Automated UI testing (Playwright/Cypress)
- [ ] Database integrity tests
- [ ] Performance monitoring
- [ ] Error tracking (Sentry)

---

**🎯 REMEMBER: It's better to spend 30 minutes testing than 3 hours fixing production issues!** 