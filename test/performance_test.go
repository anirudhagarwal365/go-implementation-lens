package main

// Performance Test: Many Interfaces and Implementations
// This file tests extension performance with larger codebases

// Interface 1-5: Basic Interfaces
type Service1 interface{ Method1() error }
type Service2 interface{ Method2() string }  
type Service3 interface{ Method3() int }
type Service4 interface{ Method4() bool }
type Service5 interface{ Method5() []string }

// Interface 6-10: Complex Interfaces
type ComplexService1 interface {
	Process(data map[string]interface{}) error
	Validate(input []string) (bool, error)
}

type ComplexService2 interface {
	Create(req *Request) (*Response, error)
	Update(id string, updates map[string]interface{}) error
	Delete(id string) error
}

type ComplexService3 interface {
	GetList(filter Filter) ([]*Item, error)
	GetByID(id string) (*Item, error)  
	Search(query string, opts ...SearchOption) ([]*Item, error)
}

type ComplexService4 interface {
	StartTransaction() Transaction
	CommitTransaction(tx Transaction) error
	RollbackTransaction(tx Transaction) error
}

type ComplexService5 interface {
	Subscribe(topic string, handler EventHandler) error
	Unsubscribe(topic string) error
	Publish(topic string, data interface{}) error
}

// Supporting Types
type Request struct{ Data interface{} }
type Response struct{ Result interface{} }
type Filter struct{ Criteria map[string]interface{} }
type Item struct{ ID string; Data interface{} }
type SearchOption func(*SearchConfig)
type SearchConfig struct{ Limit int; Offset int }
type Transaction interface{ ID() string }
type EventHandler func(interface{}) error

// Implementation 1-5: Simple Implementations
type Impl1 struct{}
func (i Impl1) Method1() error { return nil }

type Impl2 struct{}  
func (i Impl2) Method2() string { return "test" }

type Impl3 struct{}
func (i Impl3) Method3() int { return 42 }

type Impl4 struct{}
func (i Impl4) Method4() bool { return true }

type Impl5 struct{}
func (i Impl5) Method5() []string { return []string{"a", "b"} }

// Implementation 6-10: Complex Implementations
type ComplexImpl1 struct{}
func (c ComplexImpl1) Process(data map[string]interface{}) error { return nil }
func (c ComplexImpl1) Validate(input []string) (bool, error) { return true, nil }

type ComplexImpl2 struct{}
func (c ComplexImpl2) Create(req *Request) (*Response, error) { return &Response{}, nil }
func (c ComplexImpl2) Update(id string, updates map[string]interface{}) error { return nil }
func (c ComplexImpl2) Delete(id string) error { return nil }

type ComplexImpl3 struct{}
func (c ComplexImpl3) GetList(filter Filter) ([]*Item, error) { return []*Item{}, nil }
func (c ComplexImpl3) GetByID(id string) (*Item, error) { return &Item{}, nil }
func (c ComplexImpl3) Search(query string, opts ...SearchOption) ([]*Item, error) { return []*Item{}, nil }

type ComplexImpl4 struct{}
func (c ComplexImpl4) StartTransaction() Transaction { return nil }
func (c ComplexImpl4) CommitTransaction(tx Transaction) error { return nil }
func (c ComplexImpl4) RollbackTransaction(tx Transaction) error { return nil }

type ComplexImpl5 struct{}
func (c ComplexImpl5) Subscribe(topic string, handler EventHandler) error { return nil }
func (c ComplexImpl5) Unsubscribe(topic string) error { return nil }
func (c ComplexImpl5) Publish(topic string, data interface{}) error { return nil }

// Multi-Implementation Test: Multiple Structs Implementing Same Interface
type MultiService interface {
	Execute() error
}

type MultiImpl1 struct{}
func (m MultiImpl1) Execute() error { return nil }

type MultiImpl2 struct{}  
func (m MultiImpl2) Execute() error { return nil }

type MultiImpl3 struct{}
func (m MultiImpl3) Execute() error { return nil }

type MultiImpl4 struct{}
func (m MultiImpl4) Execute() error { return nil }

type MultiImpl5 struct{}
func (m MultiImpl5) Execute() error { return nil }

// Multi-Interface Implementation: One Struct Implementing Multiple Interfaces  
type SuperStruct struct{}

func (s SuperStruct) Method1() error { return nil }
func (s SuperStruct) Method2() string { return "super" }
func (s SuperStruct) Method3() int { return 100 }
func (s SuperStruct) Method4() bool { return false }
func (s SuperStruct) Method5() []string { return []string{"super"} }

// EXPECTED RESULTS:
// - MultiService should show "5 implementations"
// - SuperStruct should show "Implements: 5 interfaces"  
// - Each ComplexService should show "1 implementation"
// - Each method should show its interface implementation
// - Extension should handle this file within 2 seconds