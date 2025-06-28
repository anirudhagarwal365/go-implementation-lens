package main

// Test Case 1: Basic Interface Implementation
// EXPECTED: Interface should show "1 implementation"
// EXPECTED: Implementation should show "Implements: Writer.Write" and "Implements: Writer.Close"
type Writer interface {
	Write(data []byte) (int, error)
	Close() error
}

type FileWriter struct{}

func (f FileWriter) Write(data []byte) (int, error) {
	return len(data), nil
}

func (f FileWriter) Close() error {
	return nil
}

// Test Case 2: Signature Mismatch Detection
// EXPECTED: Interface should show "1 implementation" for CorrectImpl only
// EXPECTED: BrokenImpl should NOT show "Implements: SignatureTest.*" CodeLens
type SignatureTest interface {
	TestMethod(ctx string, data []byte) (int, error)
}

type CorrectImpl struct{}

func (c CorrectImpl) TestMethod(ctx string, data []byte) (int, error) {
	return len(data), nil
}

type BrokenImpl struct{}

// This should NOT show as implementing SignatureTest (missing error return)
func (b BrokenImpl) TestMethod(ctx string, data []byte) int {
	return len(data)
}

// Test Case 3: Parameter Type Changes
// EXPECTED: When you change 'name string' to 'name int', CodeLens should disappear
type ParameterTest interface {
	ProcessName(name string) error
}

type ParameterImpl struct{}

func (p ParameterImpl) ProcessName(name string) error {
	return nil
}

// Test Case 4: Complex Parameter Types
// EXPECTED: Should properly match complex Go types
type ComplexInterface interface {
	ProcessData(ctx context.Context, req *RequestEntity) (*ResponseEntity, error)
	GetItems(filters map[string]interface{}) ([]Item, error)
}

type RequestEntity struct {
	ID   string
	Data []byte
}

type ResponseEntity struct {
	Result string
	Count  int
}

type Item struct {
	Name  string
	Value interface{}
}

type ComplexImpl struct{}

func (c ComplexImpl) ProcessData(ctx context.Context, req *RequestEntity) (*ResponseEntity, error) {
	return &ResponseEntity{Result: "ok", Count: 1}, nil
}

func (c ComplexImpl) GetItems(filters map[string]interface{}) ([]Item, error) {
	return []Item{{Name: "test", Value: "value"}}, nil
}

// Test Case 5: Partial Implementation
// EXPECTED: Interface should show "1 implementation" (only for methods that are actually implemented)
// EXPECTED: PartialImpl should show "Implements: PartialTest.Method1" but NOT "Implements: PartialTest.Method2"
type PartialTest interface {
	Method1() error
	Method2() error
}

type PartialImpl struct{}

func (p PartialImpl) Method1() error {
	return nil
}

// Method2 is intentionally not implemented

// Test Case 6: Multiple Implementations
// EXPECTED: MultiInterface should show "2 implementations"
// EXPECTED: Each implementation should show "Implements: MultiInterface.DoSomething"
type MultiInterface interface {
	DoSomething() string
}

type FirstImpl struct{}

func (f FirstImpl) DoSomething() string {
	return "first"
}

type SecondImpl struct{}

func (s SecondImpl) DoSomething() string {
	return "second"
}

// Test Case 7: Interface with No Implementations
// EXPECTED: Should show "No implementations"
type EmptyInterface interface {
	UnimplementedMethod() error
}

// Test Case 8: Method Name Collision (Different Signatures)
// EXPECTED: Should properly distinguish between methods with same name but different signatures
type CollisionInterface1 interface {
	Process(data string) error
}

type CollisionInterface2 interface {
	Process(data []byte) error
}

type CollisionImpl1 struct{}

func (c CollisionImpl1) Process(data string) error {
	return nil
}

type CollisionImpl2 struct{}

func (c CollisionImpl2) Process(data []byte) error {
	return nil
}

// Test Case 9: Pointer vs Value Receivers
// EXPECTED: Should work with both pointer and value receivers
type ReceiverTest interface {
	ValueMethod() error
	PointerMethod() error
}

type ReceiverImpl struct{}

func (r ReceiverImpl) ValueMethod() error {
	return nil
}

func (r *ReceiverImpl) PointerMethod() error {
	return nil
}

// Test Case 10: Struct Shows Implemented Interfaces
// EXPECTED: StructImplExample should show "Implements: StructInterfaceExample"
type StructInterfaceExample interface {
	DoWork() string
	GetStatus() bool
}

type StructImplExample struct{}

func (s StructImplExample) DoWork() string {
	return "working"
}

func (s StructImplExample) GetStatus() bool {
	return true
}

// Test Case 11: Struct with Partial Implementation
// EXPECTED: PartialStructImpl should show "Implements: 0 interfaces" (because it doesn't implement all methods)
type FullInterface interface {
	Method1() error
	Method2() error
	Method3() error
}

type PartialStructImpl struct{}

func (p PartialStructImpl) Method1() error {
	return nil
}

func (p PartialStructImpl) Method2() error {
	return nil
}

// Method3 is missing - should NOT show as implementing FullInterface

// Test Case 12: Struct Implementing Multiple Interfaces
// EXPECTED: MultiInterfaceStruct should show "Implements: 2 interfaces"
type InterfaceA interface {
	MethodA() string
}

type InterfaceB interface {
	MethodB() int
}

type MultiInterfaceStruct struct{}

func (m MultiInterfaceStruct) MethodA() string {
	return "A"
}

func (m MultiInterfaceStruct) MethodB() int {
	return 42
}

// Force cache refresh - testing struct implementation detection
