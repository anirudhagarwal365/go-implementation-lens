package main

import (
	"context"
	"io"
)

// Edge Case 1: Embedded Interfaces
// EXPECTED: ReadWriteCloser should show "1 implementation"
// EXPECTED: File should show "Implements: ReadWriteCloser"
type ReadWriteCloser interface {
	io.Reader
	io.Writer
	io.Closer
}

type File struct{}

func (f File) Read(p []byte) (n int, err error)  { return 0, nil }
func (f File) Write(p []byte) (n int, err error) { return len(p), nil }
func (f File) Close() error                      { return nil }

// Edge Case 2: Generic Interfaces (Go 1.18+)
// EXPECTED: Should handle generic type parameters
type Comparable[T comparable] interface {
	Compare(other T) int
}

type StringComparator struct{}

func (s StringComparator) Compare(other string) int {
	if other == "test" {
		return 0
	}
	return 1
}

// Edge Case 3: Interface with Unexported Methods
// EXPECTED: Should work with unexported method names
type internalInterface interface {
	publicMethod() error
	privateMethod() string
}

type InternalImpl struct{}

func (i InternalImpl) publicMethod() error  { return nil }
func (i InternalImpl) privateMethod() string { return "private" }

// Edge Case 4: Methods with Complex Return Types
// EXPECTED: Should handle complex return signatures
type ComplexReturns interface {
	GetChannel() <-chan string
	GetMap() map[string]interface{}
	GetSlice() []map[string]*ComplexReturns
	GetFunction() func(int) (string, error)
}

type ComplexImpl struct{}

func (c ComplexImpl) GetChannel() <-chan string {
	ch := make(chan string)
	return ch
}

func (c ComplexImpl) GetMap() map[string]interface{} {
	return make(map[string]interface{})
}

func (c ComplexImpl) GetSlice() []map[string]*ComplexReturns {
	return nil
}

func (c ComplexImpl) GetFunction() func(int) (string, error) {
	return func(i int) (string, error) { return "", nil }
}

// Edge Case 5: Variadic Parameters
// EXPECTED: Should handle variadic parameters correctly
type VariadicInterface interface {
	Process(base string, items ...interface{}) error
	ProcessStrings(items ...string) []string
}

type VariadicImpl struct{}

func (v VariadicImpl) Process(base string, items ...interface{}) error {
	return nil
}

func (v VariadicImpl) ProcessStrings(items ...string) []string {
	return items
}

// Edge Case 6: Context with Generics and Complex Types
// EXPECTED: Should handle real-world complex signatures
type ServiceInterface interface {
	CreateResource(ctx context.Context, req *CreateRequest) (*CreateResponse, error)
	ListResources(ctx context.Context, filter map[string]interface{}, opts ...ListOption) ([]*Resource, *Pagination, error)
	UpdateResource(ctx context.Context, id string, updates map[string]interface{}) error
}

type CreateRequest struct {
	Name        string                 `json:"name"`
	Description string                 `json:"description"`
	Metadata    map[string]interface{} `json:"metadata"`
}

type CreateResponse struct {
	ID       string `json:"id"`
	Created  bool   `json:"created"`
	Resource *Resource
}

type Resource struct {
	ID       string
	Name     string
	Metadata map[string]interface{}
}

type Pagination struct {
	Page     int
	PageSize int
	Total    int
}

type ListOption func(*ListConfig)

type ListConfig struct {
	Page     int
	PageSize int
	SortBy   string
}

type RealWorldService struct{}

func (s RealWorldService) CreateResource(ctx context.Context, req *CreateRequest) (*CreateResponse, error) {
	return &CreateResponse{ID: "123", Created: true}, nil
}

func (s RealWorldService) ListResources(ctx context.Context, filter map[string]interface{}, opts ...ListOption) ([]*Resource, *Pagination, error) {
	return []*Resource{}, &Pagination{}, nil
}

func (s RealWorldService) UpdateResource(ctx context.Context, id string, updates map[string]interface{}) error {
	return nil
}

// Edge Case 7: Interface Inheritance Chain
// EXPECTED: Should handle nested interface relationships
type BaseInterface interface {
	Base() string
}

type ExtendedInterface interface {
	BaseInterface
	Extended() int
}

type FullInterface interface {
	ExtendedInterface
	Full() bool
}

type ChainImpl struct{}

func (c ChainImpl) Base() string     { return "base" }
func (c ChainImpl) Extended() int    { return 42 }
func (c ChainImpl) Full() bool       { return true }

// Edge Case 8: Same Method Name, Different Packages
// EXPECTED: Should handle methods with same names in different contexts
type LocalInterface interface {
	String() string
}

type LocalImpl struct{}

func (l LocalImpl) String() string { return "local" }

// Edge Case 9: Anonymous Interface Implementation
// EXPECTED: Should handle anonymous interfaces in function parameters
func ProcessWithAnonymousInterface(processor interface{ Process(string) error }) error {
	return processor.Process("test")
}

type AnonymousImpl struct{}

func (a AnonymousImpl) Process(data string) error { return nil }

// Edge Case 10: Interface with No Methods (Empty Interface)
// EXPECTED: Should handle empty interfaces
type EmptyMarker interface{}

type EmptyImpl struct{}

// This struct implements EmptyMarker by having no methods required

// Edge Case 11: Recursive Type Definitions
// EXPECTED: Should handle recursive type references
type Node interface {
	GetChildren() []Node
	GetParent() Node
	SetParent(Node)
}

type TreeNode struct {
	children []Node
	parent   Node
}

func (t *TreeNode) GetChildren() []Node { return t.children }
func (t *TreeNode) GetParent() Node     { return t.parent }
func (t *TreeNode) SetParent(p Node)    { t.parent = p }

// Edge Case 12: Interface Methods with Named Return Parameters
// EXPECTED: Should handle named return parameters
type NamedReturns interface {
	Calculate(a, b int) (sum int, product int, err error)
	Parse(input string) (value int, valid bool)
}

type NamedReturnsImpl struct{}

func (n NamedReturnsImpl) Calculate(a, b int) (sum int, product int, err error) {
	return a + b, a * b, nil
}

func (n NamedReturnsImpl) Parse(input string) (value int, valid bool) {
	return 0, false
}