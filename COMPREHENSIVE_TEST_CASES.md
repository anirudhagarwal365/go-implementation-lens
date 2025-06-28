# Go Interface Lens - Comprehensive Test Cases

## 🎯 **Test Strategy**

We need to test 3 main types of CodeLens:
1. **Interface CodeLens** - Shows implementation count
2. **Struct CodeLens** - Shows implemented interfaces count  
3. **Method CodeLens** - Shows which interface method it implements

## 📋 **Test Cases Matrix**

### **Category 1: Basic Interface Implementation**

| Test Case | Interface | Struct | Method | Expected Result |
|-----------|-----------|--------|--------|----------------|
| TC1.1 | `Writer` interface (line 6) | - | - | **"2 implementations"** |
| TC1.2 | - | `FileWriter` struct (line 11) | - | **"Implements: Writer"** |
| TC1.3 | - | - | `Write` method (line 13) | **"Implements: Writer.Write"** |
| TC1.4 | - | - | `Close` method (line 17) | **"Implements: Writer.Close"** |

---

### **Category 2: Signature Validation**

| Test Case | Interface | Struct | Method | Expected Result |
|-----------|-----------|--------|--------|----------------|
| TC2.1 | `SignatureTest` interface (line 24) | - | - | **"1 implementation"** (only CorrectImpl) |
| TC2.2 | - | `CorrectImpl` struct (line 28) | - | **"Implements: SignatureTest"** |
| TC2.3 | - | `BrokenImpl` struct (line 34) | - | **NO CodeLens** (signature mismatch) |
| TC2.4 | - | - | `CorrectImpl.TestMethod` (line 30) | **"Implements: SignatureTest.TestMethod"** |
| TC2.5 | - | - | `BrokenImpl.TestMethod` (line 37) | **NO CodeLens** (wrong signature) |

---

### **Category 3: Cache Invalidation**

| Test Case | Action | Expected Result |
|-----------|--------|----------------|
| TC3.1 | Change `ProcessName(name string)` to `ProcessName(name int)` in interface | CodeLens on `ParameterImpl.ProcessName` should **disappear** |
| TC3.2 | Change it back to `ProcessName(name string)` | CodeLens should **reappear** |
| TC3.3 | Add new parameter to interface method | Implementation CodeLens should **disappear** |
| TC3.4 | Add same parameter to implementation | CodeLens should **reappear** |

---

### **Category 4: Complex Types**

| Test Case | Interface | Struct | Method | Expected Result |
|-----------|-----------|--------|--------|----------------|
| TC4.1 | `ComplexInterface` (line 55) | - | - | **"1 implementation"** |
| TC4.2 | - | `ComplexImpl` struct (line 75) | - | **"Implements: ComplexInterface"** |
| TC4.3 | - | - | `ProcessData` method (line 77) | **"Implements: ComplexInterface.ProcessData"** |
| TC4.4 | - | - | `GetItems` method (line 81) | **"Implements: ComplexInterface.GetItems"** |

---

### **Category 5: Partial Implementation**

| Test Case | Interface | Struct | Method | Expected Result |
|-----------|-----------|--------|--------|----------------|
| TC5.1 | `PartialTest` interface (line 88) | - | - | **"0 implementations"** (no complete impl) |
| TC5.2 | - | `PartialImpl` struct (line 93) | - | **NO CodeLens** (incomplete) |
| TC5.3 | - | - | `PartialImpl.Method1` (line 95) | **"Implements: PartialTest.Method1"** |
| TC5.4 | Add `Method2` implementation | Struct should show **"Implements: PartialTest"** |

---

### **Category 6: Multiple Implementations**

| Test Case | Interface | Struct | Method | Expected Result |
|-----------|-----------|--------|--------|----------------|
| TC6.1 | `MultiInterface` (line 104) | - | - | **"2 implementations"** |
| TC6.2 | - | `FirstImpl` struct (line 108) | - | **"Implements: MultiInterface"** |
| TC6.3 | - | `SecondImpl` struct (line 114) | - | **"Implements: MultiInterface"** |
| TC6.4 | - | - | `FirstImpl.DoSomething` (line 110) | **"Implements: MultiInterface.DoSomething"** |
| TC6.5 | - | - | `SecondImpl.DoSomething` (line 116) | **"Implements: MultiInterface.DoSomething"** |

---

### **Category 7: Empty Interface**

| Test Case | Interface | Struct | Method | Expected Result |
|-----------|-----------|--------|--------|----------------|
| TC7.1 | `EmptyInterface` (line 122) | - | - | **"0 implementations"** |

---

### **Category 8: Method Name Collision**

| Test Case | Interface | Struct | Method | Expected Result |
|-----------|-----------|--------|--------|----------------|
| TC8.1 | `CollisionInterface1` (line 128) | - | - | **"1 implementation"** |
| TC8.2 | `CollisionInterface2` (line 132) | - | - | **"1 implementation"** |
| TC8.3 | - | `CollisionImpl1` struct (line 136) | - | **"Implements: CollisionInterface1"** |
| TC8.4 | - | `CollisionImpl2` struct (line 142) | - | **"Implements: CollisionInterface2"** |
| TC8.5 | - | - | `CollisionImpl1.Process` (line 138) | **"Implements: CollisionInterface1.Process"** |
| TC8.6 | - | - | `CollisionImpl2.Process` (line 144) | **"Implements: CollisionInterface2.Process"** |

---

### **Category 9: Pointer vs Value Receivers**

| Test Case | Interface | Struct | Method | Expected Result |
|-----------|-----------|--------|--------|----------------|
| TC9.1 | `ReceiverTest` (line 150) | - | - | **"1 implementation"** |
| TC9.2 | - | `ReceiverImpl` struct (line 155) | - | **"Implements: ReceiverTest"** |
| TC9.3 | - | - | `ValueMethod` (line 157) | **"Implements: ReceiverTest.ValueMethod"** |
| TC9.4 | - | - | `PointerMethod` (line 161) | **"Implements: ReceiverTest.PointerMethod"** |

---

### **Category 10: Struct Implementation Detection**

| Test Case | Interface | Struct | Method | Expected Result |
|-----------|-----------|--------|--------|----------------|
| TC10.1 | `StructInterfaceExample` (line 167) | - | - | **"1 implementation"** |
| TC10.2 | - | `StructImplExample` struct (line 172) | - | **"Implements: StructInterfaceExample"** |
| TC10.3 | - | - | `DoWork` method (line 174) | **"Implements: StructInterfaceExample.DoWork"** |
| TC10.4 | - | - | `GetStatus` method (line 178) | **"Implements: StructInterfaceExample.GetStatus"** |

---

### **Category 11: Partial Struct Implementation**

| Test Case | Interface | Struct | Method | Expected Result |
|-----------|-----------|--------|--------|----------------|
| TC11.1 | `FullInterface` (line 184) | - | - | **"0 implementations"** |
| TC11.2 | - | `PartialStructImpl` struct (line 190) | - | **NO CodeLens** (incomplete) |
| TC11.3 | - | - | `Method1` (line 192) | **"Implements: FullInterface.Method1"** |
| TC11.4 | - | - | `Method2` (line 196) | **"Implements: FullInterface.Method2"** |

---

### **Category 12: Multiple Interface Implementation**

| Test Case | Interface | Struct | Method | Expected Result |
|-----------|-----------|--------|--------|----------------|
| TC12.1 | `InterfaceA` (line 204) | - | - | **"1 implementation"** |
| TC12.2 | `InterfaceB` (line 208) | - | - | **"1 implementation"** |
| TC12.3 | - | `MultiInterfaceStruct` struct (line 212) | - | **"Implements: 2 interfaces"** |
| TC12.4 | - | - | `MethodA` (line 214) | **"Implements: InterfaceA.MethodA"** |
| TC12.5 | - | - | `MethodB` (line 218) | **"Implements: InterfaceB.MethodB"** |

---

## 🔧 **Additional Edge Case Tests**

### **Category 13: Cross-File Implementation**
- Interface in one file, implementation in another
- Should work across file boundaries

### **Category 14: Generic Interfaces** (Future)
- Generic interface types
- Generic method implementations

### **Category 15: Embedded Interfaces**
- Interface embedding other interfaces
- Struct implementing embedded interface methods

### **Category 16: Error Handling**
- Malformed Go code
- Syntax errors in interface/struct definitions
- Missing imports

---

## 🎯 **Test Execution Strategy**

### **Manual Testing Process:**
1. **Open `test/test_cases.go`** in VS Code
2. **Wait for extension activation** (check status bar)
3. **Verify each test case** systematically
4. **Document any failures** with line numbers and expected vs actual results

### **Automated Testing (Future):**
- Create unit tests for `GoAnalyzer` class
- Mock VS Code API calls
- Test individual methods in isolation

### **Performance Testing:**
- Measure analysis time for large files
- Test memory usage with many interfaces
- Validate cache invalidation performance

---

## 📊 **Success Criteria**

### **✅ Basic Functionality:**
- All interface CodeLens show correct implementation count
- All struct CodeLens show correct interface count  
- All method CodeLens show correct interface.method

### **✅ Signature Validation:**
- Exact signature matches work
- Signature mismatches are rejected
- Parameter type changes invalidate cache

### **✅ Edge Cases:**
- Pointer vs value receivers work correctly
- Method name collisions are handled
- Partial implementations are detected

### **✅ Performance:**
- Extension loads within 2 seconds
- CodeLens appear within 1 second of file open
- Cache invalidation works on file changes

---

## 🚨 **Known Issues to Watch For**

1. **Struct not showing implemented interfaces** (main user complaint)
2. **Cache not invalidating on signature changes**
3. **False positives in implementation detection**
4. **Cross-file detection failures**
5. **Memory leaks from cache growth**

---

## 🎉 **Testing Checklist**

- [ ] TC1: Basic Interface Implementation (4 tests)
- [ ] TC2: Signature Validation (5 tests)  
- [ ] TC3: Cache Invalidation (4 tests)
- [ ] TC4: Complex Types (4 tests)
- [ ] TC5: Partial Implementation (4 tests)
- [ ] TC6: Multiple Implementations (5 tests)
- [ ] TC7: Empty Interface (1 test)
- [ ] TC8: Method Name Collision (6 tests)
- [ ] TC9: Pointer vs Value Receivers (4 tests)
- [ ] TC10: Struct Implementation Detection (4 tests)
- [ ] TC11: Partial Struct Implementation (4 tests)
- [ ] TC12: Multiple Interface Implementation (5 tests)

**Total: 50 individual test cases across 12 categories**