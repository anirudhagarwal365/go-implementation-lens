package main

// SimpleInterface is a test interface
type SimpleInterface interface {
	Method1() string
	Method2(x int) bool
}

// Implementation1 implements SimpleInterface
type Implementation1 struct{}

func (i Implementation1) Method1() string {
	return "impl1"
}

func (i Implementation1) Method2(x int) bool {
	return x > 0
}