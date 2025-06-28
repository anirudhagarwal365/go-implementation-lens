package main

// TestInterface is an interface for testing.

type TestInterface interface {
	TestMethod()
}

// TestStruct is a struct for testing.

type TestStruct struct{}

// TestMethod implements TestInterface.
func (s *TestStruct) TestMethod() {}
