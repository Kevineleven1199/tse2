import ServiceRequestForm from "@/components/forms/service-request-form";

const RequestPage = () => (
  <div className="bg-surface py-20">
    <div className="section-wrapper flex flex-col gap-8">
      <div className="max-w-3xl">
        <h1 className="text-4xl font-semibold text-accent">Book TriState in Minutes</h1>
        <p className="mt-4 text-muted-foreground">
          Answer a couple questions to receive an AI-personalized quote, custom availability windows, and match with the perfect crew.
        </p>
      </div>
      <ServiceRequestForm />
    </div>
  </div>
);

export default RequestPage;
