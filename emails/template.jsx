// // Importing components from @react-email/components to construct the email layout
// import {
//   Body,        // Main content wrapper for the email body
//   Container,   // Centers and constrains the width of the content
//   Head,        // For including metadata like title, styles (optional)
//   Heading,     // For adding headings in the email
//   Html,        // The root component that wraps the entire email HTML
//   Preview,     // Text shown as email preview (next to subject in email client)
//   Section,     // Used to group content in a styled block
//   Text         // For paragraphs or any text content
// } from "@react-email/components";

// // Dummy data to simulate how the email would look during development
// const PREVIEW_DATA = {
//   monthlyReport: {
//     userName: "Shahryar Amjad",
//     type: "monthly-report",
//     data: {
//       month: "June",
//       stats: {
//         totalIncome: 5000,
//         totalExpenses: 3500,
//         byCategory: {
//           housing: 1500,
//           groceries: 600,
//           transportation: 400,
//           entertainment: 300,
//           utilities: 700,
//         },
//       },
//       insights: [
//         "Your housing expenses are 43% of your total spending - consider reviewing your housing costs.",
//         "Great job keeping entertainment expenses under control this month!",
//         "Setting up automatic savings could help you save 20% more of your income.",
//       ],
//     },
//   },
//   budgetAlert: {
//     userName: "John Doe",
//     type: "budget-alert",
//     data: {
//       percentageUsed: 85,
//       budgetAmount: 4000,
//       totalExpenses: 3400,
//     },
//   },
// };

// // The main email component
// export default function EmailTemplate({
//   userName = "",    // default name in case none is passed
//   type = "monthly-report", // default type
//   data = {},        // default empty data object
// }) {
//   // If email type is "monthly-report", render monthly report content
//   if (type === "monthly-report") {
//     return (
//       <Html>
//         <Head />
//         <Preview>Your Monthly Financial Report</Preview>
//         <Body style={styles.body}>
//           <Container style={styles.container}>
//             <Heading style={styles.title}>Monthly Financial Report</Heading>

//             {/* Greeting message */}
//             <Text style={styles.text}>Hello {userName},</Text>
//             <Text style={styles.text}>
//               Here&rsquo;s your financial summary for {data?.month}:
//             </Text>

//             {/* Display income, expenses, and net total */}
//             <Section style={styles.statsContainer}>
//               <div style={styles.stat}>
//                 <Text style={styles.text}>Total Income</Text>
//                 <Text style={styles.heading}>${data?.stats.totalIncome}</Text>
//               </div>
//               <div style={styles.stat}>
//                 <Text style={styles.text}>Total Expenses</Text>
//                 <Text style={styles.heading}>${data?.stats.totalExpenses}</Text>
//               </div>
//               <div style={styles.stat}>
//                 <Text style={styles.text}>Net</Text>
//                 <Text style={styles.heading}>
//                   ${data?.stats.totalIncome - data?.stats.totalExpenses}
//                 </Text>
//               </div>
//             </Section>

//             {/* Breakdown of expenses by category */}
//             {data?.stats?.byCategory && (
//               <Section style={styles.section}>
//                 <Heading style={styles.heading}>Expenses by Category</Heading>
//                 {Object.entries(data?.stats.byCategory).map(
//                   ([category, amount]) => (
//                     <div key={category} style={styles.row}>
//                       <Text style={styles.text}>{category}</Text>
//                       <Text style={styles.text}>${amount}</Text>
//                     </div>
//                   )
//                 )}
//               </Section>
//             )}

//             {/* Display AI-generated insights */}
//             {data?.insights && (
//               <Section style={styles.section}>
//                 <Heading style={styles.heading}>Welth Insights</Heading>
//                 {data.insights.map((insight, index) => (
//                   <Text key={index} style={styles.text}>
//                     • {insight}
//                   </Text>
//                 ))}
//               </Section>
//             )}

//             {/* Closing footer message */}
//             <Text style={styles.footer}>
//               Thank you for using Welth. Keep tracking your finances for better
//               financial health!
//             </Text>
//           </Container>
//         </Body>
//       </Html>
//     );
//   }

//   // If email type is "budget-alert", render budget alert content
//   if (type === "budget-alert") {
//     return (
//       <Html>
//         <Head />
//         <Preview>Budget Alert</Preview>
//         <Body style={styles.body}>
//           <Container style={styles.container}>
//             <Heading style={styles.title}>Budget Alert</Heading>

//             {/* Greeting and message */}
//             <Text style={styles.text}>Hello {userName},</Text>
//             <Text style={styles.text}>
//               You&rsquo;ve used {data?.percentageUsed.toFixed(1)}% of your
//               monthly budget.
//             </Text>

//             {/* Display budget stats */}
//             <Section style={styles.statsContainer}>
//               <div style={styles.stat}>
//                 <Text style={styles.text}>Budget Amount</Text>
//                 <Text style={styles.heading}>${data?.budgetAmount}</Text>
//               </div>
//               <div style={styles.stat}>
//                 <Text style={styles.text}>Spent So Far</Text>
//                 <Text style={styles.heading}>${data?.totalExpenses}</Text>
//               </div>
//               <div style={styles.stat}>
//                 <Text style={styles.text}>Remaining</Text>
//                 <Text style={styles.heading}>
//                   ${data?.budgetAmount - data?.totalExpenses}
//                 </Text>
//               </div>
//             </Section>
//           </Container>
//         </Body>
//       </Html>
//     );
//   }
// }

// // Style definitions used throughout the email
// const styles = {
//   body: {
//     backgroundColor: "#f6f9fc", // light background
//     fontFamily: "-apple-system, sans-serif", // fallback font
//   },
//   container: {
//     backgroundColor: "#ffffff", // white box
//     margin: "0 auto",           // center the content
//     padding: "20px",            // inner spacing
//     borderRadius: "5px",        // rounded corners
//     boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)", // subtle shadow
//   },
//   title: {
//     color: "#1f2937",           // dark text
//     fontSize: "32px",           // large title size
//     fontWeight: "bold",
//     textAlign: "center",
//     margin: "0 0 20px",         // space below title
//   },
//   heading: {
//     color: "#1f2937",           // dark gray
//     fontSize: "20px",
//     fontWeight: "600",
//     margin: "0 0 16px",
//   },
//   text: {
//     color: "#4b5563",           // mid-gray for readability
//     fontSize: "16px",
//     margin: "0 0 16px",
//   },
//   section: {
//     marginTop: "32px",
//     padding: "20px",
//     backgroundColor: "#f9fafb", // very light gray
//     borderRadius: "5px",
//     border: "1px solid #e5e7eb",
//   },
//   statsContainer: {
//     margin: "32px 0",
//     padding: "20px",
//     backgroundColor: "#f9fafb",
//     borderRadius: "5px",
//   },
//   stat: {
//     marginBottom: "16px",
//     padding: "12px",
//     backgroundColor: "#fff",
//     borderRadius: "4px",
//     boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
//   },
//   row: {
//     display: "flex",                  // horizontal layout
//     justifyContent: "space-between", // space between category and value
//     padding: "12px 0",
//     borderBottom: "1px solid #e5e7eb",
//   },
//   footer: {
//     color: "#6b7280",           // light gray
//     fontSize: "14px",
//     textAlign: "center",
//     marginTop: "32px",
//     paddingTop: "16px",
//     borderTop: "1px solid #e5e7eb", // separate footer
//   },
// };
// Importing components from @react-email/components to construct the email layout
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text
} from "@react-email/components";

// Dummy data for development preview
const PREVIEW_DATA = {
  monthlyReport: {
    userName: "Shahryar Amjad",
    type: "monthly-report",
    data: {
      month: "June",
      stats: {
        totalIncome: 5000,
        totalExpenses: 3500,
        byCategory: {
          housing: 1500,
          groceries: 600,
          transportation: 400,
          entertainment: 300,
          utilities: 700,
        },
      },
      insights: [
        "Your housing expenses are 43% of your total spending - consider reviewing your housing costs.",
        "Great job keeping entertainment expenses under control this month!",
        "Setting up automatic savings could help you save 20% more of your income.",
      ],
    },
  },
  budgetAlert: {
    userName: "John Doe",
    type: "budget-alert",
    data: {
      percentageUsed: 85,
      budgetAmount: 4000,
      totalExpenses: 3400,
    },
  },
};

export default function EmailTemplate({
  userName = "",
  type = "monthly-report",
  data = {},
}) {
  // Default values to avoid undefined errors
  const income = data?.stats?.totalIncome ?? 0;
  const expenses = data?.stats?.totalExpenses ?? 0;
  const net = income - expenses;

  // Monthly Report
  if (type === "monthly-report") {
    return (
      <Html>
        <Head />
        <Preview>Your Monthly Financial Report</Preview>
        <Body style={styles.body}>
          <Container style={styles.container}>
            <Heading style={styles.title}>Monthly Financial Report</Heading>

            <Text style={styles.text}>Hello {userName},</Text>
            <Text style={styles.text}>
              Here&rsquo;s your financial summary for {data?.month || "this month"}:
            </Text>

            <Section style={styles.statsContainer}>
              <div style={styles.stat}>
                <Text style={styles.text}>Total Income</Text>
                <Text style={styles.heading}>${income}</Text>
              </div>
              <div style={styles.stat}>
                <Text style={styles.text}>Total Expenses</Text>
                <Text style={styles.heading}>${expenses}</Text>
              </div>
              <div style={styles.stat}>
                <Text style={styles.text}>Net</Text>
                <Text style={styles.heading}>${net}</Text>
              </div>
            </Section>

            {data?.stats?.byCategory && (
              <Section style={styles.section}>
                <Heading style={styles.heading}>Expenses by Category</Heading>
                {Object.entries(data.stats.byCategory).map(
                  ([category, amount]) => (
                    <div key={category} style={styles.row}>
                      <Text style={styles.text}>{category}</Text>
                      <Text style={styles.text}>${amount}</Text>
                    </div>
                  )
                )}
              </Section>
            )}

            {data?.insights && (
              <Section style={styles.section}>
                <Heading style={styles.heading}>Welth Insights</Heading>
                {data.insights.map((insight, index) => (
                  <Text key={index} style={styles.text}>
                    • {insight}
                  </Text>
                ))}
              </Section>
            )}

            <Text style={styles.footer}>
              Thank you for using Our Finance Platform. Keep tracking your finances for better
              financial health!
            </Text>
          </Container>
        </Body>
      </Html>
    );
  }

  // Budget Alert
  if (type === "budget-alert") {
    const percentageUsed = data?.percentageUsed?.toFixed(1) ?? "0.0";
    const budgetAmount = data?.budgetAmount ?? 0;
    const totalExpenses = data?.totalExpenses ?? 0;
    const remaining = budgetAmount - totalExpenses;

    return (
      <Html>
        <Head />
        <Preview>Budget Alert</Preview>
        <Body style={styles.body}>
          <Container style={styles.container}>
            <Heading style={styles.title}>Budget Alert</Heading>

            <Text style={styles.text}>Hello {userName},</Text>
            <Text style={styles.text}>
              You&rsquo;ve used {percentageUsed}% of your monthly budget.
            </Text>

            <Section style={styles.statsContainer}>
              <div style={styles.stat}>
                <Text style={styles.text}>Budget Amount</Text>
                <Text style={styles.heading}>${budgetAmount}</Text>
              </div>
              <div style={styles.stat}>
                <Text style={styles.text}>Spent So Far</Text>
                <Text style={styles.heading}>${totalExpenses}</Text>
              </div>
              <div style={styles.stat}>
                <Text style={styles.text}>Remaining</Text>
                <Text style={styles.heading}>${remaining}</Text>
              </div>
            </Section>
          </Container>
        </Body>
      </Html>
    );
  }

  return null;
}

// Style definitions
const styles = {
  body: {
    backgroundColor: "#f6f9fc",
    fontFamily: "-apple-system, sans-serif",
  },
  container: {
    backgroundColor: "#ffffff",
    margin: "0 auto",
    padding: "20px",
    borderRadius: "5px",
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
  },
  title: {
    color: "#1f2937",
    fontSize: "32px",
    fontWeight: "bold",
    textAlign: "center",
    margin: "0 0 20px",
  },
  heading: {
    color: "#1f2937",
    fontSize: "20px",
    fontWeight: "600",
    margin: "0 0 16px",
  },
  text: {
    color: "#4b5563",
    fontSize: "16px",
    margin: "0 0 16px",
  },
  section: {
    marginTop: "32px",
    padding: "20px",
    backgroundColor: "#f9fafb",
    borderRadius: "5px",
    border: "1px solid #e5e7eb",
  },
  statsContainer: {
    margin: "32px 0",
    padding: "20px",
    backgroundColor: "#f9fafb",
    borderRadius: "5px",
  },
  stat: {
    marginBottom: "16px",
    padding: "12px",
    backgroundColor: "#fff",
    borderRadius: "4px",
    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    padding: "12px 0",
    borderBottom: "1px solid #e5e7eb",
  },
  footer: {
    color: "#6b7280",
    fontSize: "14px",
    textAlign: "center",
    marginTop: "32px",
    paddingTop: "16px",
    borderTop: "1px solid #e5e7eb",
  },
};

// You can test render using:
// <EmailTemplate {...PREVIEW_DATA.monthlyReport} />

